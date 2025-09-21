import { Injectable, Logger } from '@nestjs/common';
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
import { RowWithContext } from 'src/features/share/types/row-with-context.types';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@Injectable()
export class RowApiService {
  private readonly logger = new Logger(RowApiService.name);

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
    return this.rowCache.getRows(
      data.revisionId,
      data.tableId,
      data,
      async () => {
        const result = await this.api.getRows(data);
        void this.warmRowCache(result.edges.map((edge) => edge.node)).catch(
          (e) => {
            this.logger.warn(`Row cache warming failed (non-critical)`, e);
          },
        );
        return result;
      },
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

  private async warmRowCache(rows: RowWithContext[]) {
    await Promise.all(
      rows.map((row) =>
        this.rowCache.row({ ...row.context, rowId: row.id }, () =>
          Promise.resolve(row),
        ),
      ),
    );
  }
}
