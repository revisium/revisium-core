import { Injectable, Logger } from '@nestjs/common';
import { EngineApiService } from '@revisium/engine';
import {
  GetRowByIdQueryData,
  GetRowQueryData,
  GetRowsQueryData,
  ResolveRowCountForeignKeysByQueryData,
  ResolveRowCountForeignKeysToQueryData,
  ResolveRowForeignKeysByQueryData,
  ResolveRowForeignKeysToQueryData,
  SearchRowsQueryData,
} from 'src/features/row/queries/impl';
import { RowWithContext } from 'src/features/share/types/row-with-context.types';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';

@Injectable()
export class RowApiService {
  private readonly logger = new Logger(RowApiService.name);

  constructor(
    private readonly engine: EngineApiService,
    private readonly rowCache: RowCacheService,
  ) {}

  public getRow(data: GetRowQueryData) {
    return this.rowCache.row(data, () => this.engine.getRow(data));
  }

  public getRowById(data: GetRowByIdQueryData) {
    return this.rowCache.row(data, () => this.engine.getRowById(data));
  }

  public getRows(data: GetRowsQueryData) {
    return this.rowCache.getRows(
      data.revisionId,
      data.tableId,
      data,
      async () => {
        const result = await this.engine.getRows(data as any);
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
    return this.engine.resolveRowCountForeignKeysBy(data);
  }

  public resolveRowCountForeignKeysTo(
    data: ResolveRowCountForeignKeysToQueryData,
  ) {
    return this.engine.resolveRowCountForeignKeysTo(data);
  }

  public resolveRowForeignKeysBy(data: ResolveRowForeignKeysByQueryData) {
    return this.engine.resolveRowForeignKeysBy(data);
  }

  public resolveRowForeignKeysTo(data: ResolveRowForeignKeysToQueryData) {
    return this.engine.resolveRowForeignKeysTo(data);
  }

  public searchRows(data: SearchRowsQueryData) {
    return this.engine.searchRows(data);
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
