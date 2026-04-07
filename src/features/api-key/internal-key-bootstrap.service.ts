import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import { ApiKeyType } from 'src/__generated__/client';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const INTERNAL_SERVICE_NAME = 'endpoint';
const KEY_NAME = 'internal-endpoint';

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
    const isMonolith = this.options.mode === 'monolith';
    let internalApiKey = this.configService.get<string>('INTERNAL_API_KEY');

    if (!internalApiKey && isMonolith) {
      internalApiKey = `rev_${nanoid(22)}`;
      process.env.INTERNAL_API_KEY = internalApiKey;
      this.logger.log(
        `Internal API key for '${INTERNAL_SERVICE_NAME}' service auto-generated`,
      );
    }

    if (!internalApiKey) {
      return;
    }

    if (!this.apiKeyService.validateKeyFormat(internalApiKey)) {
      this.logger.error(
        `INTERNAL_API_KEY has invalid format (expected rev_ + 22 chars). Skipping registration.`,
      );
      return;
    }

    await this.upsertInternalKey(internalApiKey);
  }

  private async upsertInternalKey(key: string): Promise<void> {
    const newHash = this.apiKeyService.hashKey(key);

    const existing = await this.prisma.apiKey.findFirst({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: INTERNAL_SERVICE_NAME,
        revokedAt: null,
      },
    });

    if (existing && existing.keyHash === newHash) {
      this.logger.log(
        `Internal API key for '${INTERNAL_SERVICE_NAME}' service initialized`,
      );
      return;
    }

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
          name: KEY_NAME,
          internalServiceName: INTERNAL_SERVICE_NAME,
        },
      });
    });

    if (existing) {
      await this.authCache.invalidateApiKeyByHash(existing.keyHash);
      this.logger.log(
        `Revoked old internal API key for '${INTERNAL_SERVICE_NAME}' service`,
      );
    }

    this.logger.log(
      `Internal API key for '${INTERNAL_SERVICE_NAME}' service initialized`,
    );
  }
}
