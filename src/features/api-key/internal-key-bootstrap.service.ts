import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { nanoid } from 'nanoid';
import { ApiKeyType, Prisma } from 'src/__generated__/client';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const INTERNAL_KEY_ENV_PREFIX = 'INTERNAL_API_KEY_';
const DEFAULT_SERVICES = ['endpoint'];

@Injectable()
export class InternalKeyBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(InternalKeyBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyService: ApiKeyService,
    private readonly authCache: AuthCacheService,
    private readonly configService: ConfigService,
    @Inject(APP_OPTIONS_TOKEN) private readonly options: AppOptions,
  ) {}

  async onModuleInit() {
    if (this.options.mode === 'monolith') {
      await this.bootstrapMonolith();
    } else {
      await this.bootstrapMicroservice();
    }
  }

  private resolveMonolithServices(): string[] {
    // Allow the monolith services list to be overridden via env/config.
    // Production falls back to DEFAULT_SERVICES. Tests use this hook to
    // namespace each spec so parallel-worker writes to the shared DB do
    // not collide with per-spec assertions.
    const override = this.configService.get<string>(
      'INTERNAL_MONOLITH_SERVICES',
    );
    if (!override) {
      return DEFAULT_SERVICES;
    }
    const parsed = override
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parsed.length > 0 ? parsed : DEFAULT_SERVICES;
  }

  private async bootstrapMonolith() {
    this.warnIfEnvVarsSet();

    const jwtSecret = this.configService.get<string>('JWT_SECRET');

    for (const serviceName of this.resolveMonolithServices()) {
      let key: string;

      if (jwtSecret) {
        key = this.deriveKey(jwtSecret, serviceName);
      } else {
        key = `rev_${nanoid(22)}`;
        this.logger.warn(
          `JWT_SECRET not set — generated random internal key for '${serviceName}'. ` +
            `Set JWT_SECRET for multi-replica deployments.`,
        );
      }

      const envVar = `${INTERNAL_KEY_ENV_PREFIX}${serviceName.toUpperCase()}`;
      process.env[envVar] = key;

      await this.upsertInternalKey(key, serviceName);
    }
  }

  private async bootstrapMicroservice() {
    const services = this.scanEnvForServices();

    if (services.length === 0) {
      return;
    }

    for (const { serviceName, key, envVar } of services) {
      if (!this.apiKeyService.validateKeyFormat(key)) {
        this.logger.error(
          `${envVar} has invalid format (expected rev_ + 22 chars). Skipping registration.`,
        );
        continue;
      }

      await this.upsertInternalKey(key, serviceName);
    }
  }

  private deriveKey(jwtSecret: string, serviceName: string): string {
    const hmac = createHmac('sha256', jwtSecret);
    hmac.update(`revisium:internal-key:${serviceName}`);
    return `rev_${hmac.digest('base64url').substring(0, 22)}`;
  }

  private scanEnvForServices(): Array<{
    serviceName: string;
    key: string;
    envVar: string;
  }> {
    const result: Array<{ serviceName: string; key: string; envVar: string }> =
      [];

    for (const [envKey, value] of Object.entries(process.env)) {
      if (envKey.startsWith(INTERNAL_KEY_ENV_PREFIX) && value) {
        const suffix = envKey.slice(INTERNAL_KEY_ENV_PREFIX.length);
        result.push({
          serviceName: suffix.toLowerCase(),
          key: value,
          envVar: envKey,
        });
      }
    }

    return result;
  }

  private warnIfEnvVarsSet() {
    for (const envKey of Object.keys(process.env)) {
      if (envKey.startsWith(INTERNAL_KEY_ENV_PREFIX)) {
        this.logger.warn(
          `${envKey} is set but ignored in monolith mode. Internal keys are derived from JWT_SECRET.`,
        );
      }
    }
  }

  private async upsertInternalKey(
    key: string,
    serviceName: string,
  ): Promise<void> {
    const keyName = `internal-${serviceName}`;
    const newHash = this.apiKeyService.hashKey(key);

    const existing = await this.prisma.apiKey.findFirst({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: serviceName,
        revokedAt: null,
      },
    });

    if (existing?.keyHash === newHash) {
      this.logger.log(
        `Internal API key for '${serviceName}' service initialized`,
      );
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (existing) {
          await tx.apiKey.update({
            where: { id: existing.id },
            data: { revokedAt: new Date() },
          });
        }

        await tx.apiKey.create({
          data: {
            prefix: 'rev_',
            keyHash: newHash,
            type: ApiKeyType.INTERNAL,
            name: keyName,
            internalServiceName: serviceName,
          },
        });
      });

      if (existing) {
        await this.authCache.invalidateApiKeyByHash(existing.keyHash);
        this.logger.log(
          `Revoked old internal API key for '${serviceName}' service`,
        );
      }

      this.logger.log(
        `Internal API key for '${serviceName}' service initialized`,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.log(
          `Internal API key for '${serviceName}' service already registered by another instance`,
        );
        return;
      }
      throw error;
    }
  }
}
