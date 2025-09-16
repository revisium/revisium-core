import { Injectable } from '@nestjs/common';
import { InternalRevisionsApiService } from 'src/features/revision/internal-revisions-api.service';
import {
  GetMigrationsQueryData,
  GetRevisionQueryData,
} from 'src/features/revision/queries/impl';
import { CacheService } from 'src/infrastructure/cache';

@Injectable()
export class RevisionsApiService {
  constructor(
    private readonly api: InternalRevisionsApiService,
    private readonly cache: CacheService,
  ) {}

  public revision(data: GetRevisionQueryData) {
    return this.cache.getOrSet({
      key: `revision:revision:${data.revisionId}`,
      tags: [`revision-${data.revisionId}`],
      ttl: '1d',
      factory: () => this.api.revision(data),
    });
  }

  public migrations(data: GetMigrationsQueryData) {
    return this.api.migrations(data);
  }
}
