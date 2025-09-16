import { Injectable } from '@nestjs/common';
import {
  REVISION_CACHE_CONFIG,
  REVISION_CACHE_KEYS,
  REVISION_CACHE_TAGS,
} from 'src/infrastructure/cache/constants/revision-cache.constants';
import { CacheService } from './cache.service';

export interface RevisionCacheData {
  revisionId: string;
}

@Injectable()
export class RevisionCacheService {
  constructor(private readonly cache: CacheService) {}

  async revision<T>(data: RevisionCacheData, factory: () => Promise<T>) {
    return this.cache.getOrSet({
      key: REVISION_CACHE_KEYS.REVISION(data.revisionId),
      ttl: REVISION_CACHE_CONFIG.TTL,
      tags: [REVISION_CACHE_TAGS.REVISION(data.revisionId)],
      factory,
    });
  }

  public async invalidateRevisions(revisionIds: string[]): Promise<void> {
    await this.cache.deleteByTag({
      tags: revisionIds.map((revisionId) =>
        REVISION_CACHE_TAGS.REVISION(revisionId),
      ),
    });
  }
}
