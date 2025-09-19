import { Injectable } from '@nestjs/common';
import { InternalRevisionsApiService } from 'src/features/revision/internal-revisions-api.service';
import {
  GetMigrationsQueryData,
  GetRevisionQueryData,
} from 'src/features/revision/queries/impl';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';

@Injectable()
export class RevisionsApiService {
  constructor(
    private readonly api: InternalRevisionsApiService,
    private readonly cache: RevisionCacheService,
  ) {}

  public revision(data: GetRevisionQueryData) {
    return this.cache.revision(data, () => this.api.revision(data));
  }

  public migrations(data: GetMigrationsQueryData) {
    return this.api.migrations(data);
  }
}
