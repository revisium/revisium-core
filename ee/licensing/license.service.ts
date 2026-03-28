import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { LicensePayload } from './license-payload.interface';

const LICENSING_URL = 'https://licensing.revisium.io';
const GRACE_PERIOD_DAYS = 7;
const REVALIDATION_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT_MS = 5000;

@Injectable()
export class LicenseService implements OnModuleInit {
  private readonly logger = new Logger(LicenseService.name);
  private license: LicensePayload | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const key = this.configService.get<string>('REVISIUM_LICENSE_KEY');
    if (!key) {
      this.logger.warn('REVISIUM_LICENSE_KEY not set — /ee/ features disabled');
      return;
    }
    await this.validate(key);
  }

  @Interval(REVALIDATION_INTERVAL_MS)
  async revalidate(): Promise<void> {
    const key = this.configService.get<string>('REVISIUM_LICENSE_KEY');
    if (key) {
      await this.validate(key);
    }
  }

  async validate(key: string): Promise<void> {
    try {
      const response = await fetch(`${LICENSING_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`License server returned ${response.status}`);
      }

      const payload: LicensePayload = await response.json();
      this.license = payload;
      await this.persistToDb(payload);
      this.logger.log(
        `License validated: features=[${payload.features.join(', ')}], expires=${new Date(payload.exp * 1000).toISOString()}`,
      );
      return;
    } catch (error) {
      this.logger.warn(
        `License server unreachable: ${error instanceof Error ? error.message : error}`,
      );
    }

    // Fallback: load from database
    const cached = await this.loadFromDb();
    if (cached && this.isWithinGracePeriod(cached)) {
      this.license = cached;
      this.logger.warn('Using cached license from database');
      return;
    }

    this.license = null;
    this.logger.error(
      'License validation failed — /ee/ features disabled (noop mode)',
    );
  }

  hasFeature(feature: string): boolean {
    if (!this.license) return false;
    if (this.isExpired()) return false;
    return this.license.features.includes(feature);
  }

  getLicense(): LicensePayload | null {
    return this.license;
  }

  private isExpired(): boolean {
    return this.license ? this.license.exp < Date.now() / 1000 : true;
  }

  private isWithinGracePeriod(payload: LicensePayload): boolean {
    const graceEnd = (payload.exp + GRACE_PERIOD_DAYS * 86400) * 1000;
    return Date.now() < graceEnd;
  }

  private async persistToDb(payload: LicensePayload): Promise<void> {
    try {
      await this.prisma.licenseCache.upsert({
        where: { id: 'current' },
        update: {
          payload: payload as any,
          validatedAt: new Date(),
        },
        create: {
          id: 'current',
          payload: payload as any,
          validatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist license to database: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async loadFromDb(): Promise<LicensePayload | null> {
    try {
      const cached = await this.prisma.licenseCache.findUnique({
        where: { id: 'current' },
      });
      if (!cached) return null;
      return cached.payload as unknown as LicensePayload;
    } catch (error) {
      this.logger.warn(
        `Failed to load license from database: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }
}
