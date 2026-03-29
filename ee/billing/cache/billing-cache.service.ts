import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  BILLING_CACHE_KEYS,
  BILLING_CACHE_TAGS,
  BILLING_CACHE_CONFIG,
} from './billing-cache.constants';

@Injectable()
export class BillingCacheService {
  constructor(
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  public subscription<T>(organizationId: string, factory: () => Promise<T>) {
    return this.cache.getOrSet({
      key: BILLING_CACHE_KEYS.SUBSCRIPTION(organizationId),
      ttl: BILLING_CACHE_CONFIG.SUBSCRIPTION_TTL,
      tags: [BILLING_CACHE_TAGS.ORG_BILLING(organizationId)],
      factory,
    });
  }

  public usage<T>(
    organizationId: string,
    metric: string,
    factory: () => Promise<T>,
  ) {
    return this.cache.getOrSet({
      key: BILLING_CACHE_KEYS.USAGE(organizationId, metric),
      ttl: BILLING_CACHE_CONFIG.USAGE_TTL,
      tags: [BILLING_CACHE_TAGS.ORG_USAGE(organizationId)],
      factory,
    });
  }

  public async resolveOrgId(revisionId: string): Promise<string | null> {
    return this.cache.getOrSet({
      key: BILLING_CACHE_KEYS.REVISION_ORG(revisionId),
      ttl: BILLING_CACHE_CONFIG.REVISION_ORG_TTL,
      factory: async () => {
        const revision = await this.prisma.revision.findUnique({
          where: { id: revisionId },
          select: {
            branch: {
              select: { project: { select: { organizationId: true } } },
            },
          },
        });
        return revision?.branch.project.organizationId ?? null;
      },
    });
  }

  public async invalidateOrgUsage(organizationId: string) {
    await this.cache.deleteByTag({
      tags: [BILLING_CACHE_TAGS.ORG_USAGE(organizationId)],
    });
  }

  public async invalidateOrgBilling(organizationId: string) {
    await this.cache.deleteByTag({
      tags: [BILLING_CACHE_TAGS.ORG_BILLING(organizationId)],
    });
  }
}
