import { Injectable } from '@nestjs/common';
import { InternalRowApiService } from 'src/features/row/internal-row-api.service';
import {
  GetRowByIdQueryData,
  GetRowQueryData,
  GetRowsQueryData,
  ResolveRowCountForeignKeysByQueryData,
  ResolveRowCountForeignKeysToQueryData,
  ResolveRowForeignKeysByQueryData,
  ResolveRowForeignKeysToQueryData,
} from 'src/features/row/queries/impl';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@Injectable()
export class RowApiService {
  constructor(
    private readonly api: InternalRowApiService,
    private readonly rowCache: RowCacheService,
  ) {}

  public getRow(data: GetRowQueryData) {
    return this.rowCache.row(data, () => this.api.getRow(data));
  }

  public getRowById(data: GetRowByIdQueryData) {
    return this.rowCache.row(data, () => this.api.getRowById(data));
  }

  public getRows(data: GetRowsQueryData) {
    return this.rowCache.getRows(data.revisionId, data.tableId, data, () =>
      this.api.getRows(data),
    );
  }

  public resolveRowCountForeignKeysBy(
    data: ResolveRowCountForeignKeysByQueryData,
  ) {
    return this.api.resolveRowCountForeignKeysBy(data);
  }

  public resolveRowCountForeignKeysTo(
    data: ResolveRowCountForeignKeysToQueryData,
  ) {
    return this.api.resolveRowCountForeignKeysTo(data);
  }

  public resolveRowForeignKeysBy(data: ResolveRowForeignKeysByQueryData) {
    return this.api.resolveRowForeignKeysBy(data);
  }

  public resolveRowForeignKeysTo(data: ResolveRowForeignKeysToQueryData) {
    return this.api.resolveRowForeignKeysTo(data);
  }
}
