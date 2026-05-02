import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { makeCacheKeyFromArgs } from 'src/utils/utils/stable-cache-key';
import { AUTH_CACHE_TAGS } from '../constants/auth-cache.constants';
import {
  PROJECT_CACHE_CONFIG,
  PROJECT_CACHE_KEYS,
} from '../constants/project-cache.constants';

@Injectable()
export class ProjectCacheService {
  constructor(private readonly cache: CacheService) {}

  public async projectIdentity<
    T extends { organizationId: string; projectName: string } | null,
  >(
    query: {
      revisionId?: string;
      endpointId?: string;
      projectId?: string;
      organizationId?: string;
      projectName?: string;
    },
    factory: () => Promise<T>,
  ): Promise<T> {
    const keyHash = makeCacheKeyFromArgs([query], {
      prefix: PROJECT_CACHE_KEYS.PROJECT_IDENTITY,
      version: PROJECT_CACHE_CONFIG.KEY_VERSION,
    });

    return this.cache.getOrSet({
      key: keyHash,
      ttl: PROJECT_CACHE_CONFIG.PROJECT_IDENTITY_TTL,
      tags: [AUTH_CACHE_TAGS.AUTH_RELATIVES],
      factory,
    });
  }
}
