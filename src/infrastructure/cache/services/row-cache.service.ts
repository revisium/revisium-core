import { Injectable } from '@nestjs/common';
import { GetSetFactory } from 'bentocache/types';
import { CacheService } from './cache.service';
import { makeCacheKeyFromArgs } from 'src/utils/utils/stable-cache-key';
import {
  ROW_CACHE_KEYS,
  ROW_CACHE_TAGS,
  ROW_CACHE_CONFIG,
} from '../constants/row-cache.constants';

export interface RowCacheData {
  revisionId: string;
  tableId: string;
  rowId: string;
}

@Injectable()
export class RowCacheService {
  constructor(private readonly cache: CacheService) {}

  public async row<T>(data: RowCacheData, factory: () => Promise<T>) {
    return this.cache.getOrSet({
      key: ROW_CACHE_KEYS.ROW(data.revisionId, data.tableId, data.rowId),
      ttl: ROW_CACHE_CONFIG.TTL,
      tags: [
        ROW_CACHE_TAGS.REVISION_RELATIVES(data.revisionId),
        ROW_CACHE_TAGS.TABLE_RELATIVES(data.revisionId, data.tableId),
      ],
      factory,
    });
  }

  public async getRows<T, TQuery>(
    revisionId: string,
    tableId: string,
    query: TQuery,
    factory: GetSetFactory<T>,
  ) {
    return this.cache.getOrSet({
      key: makeCacheKeyFromArgs([query], {
        prefix: ROW_CACHE_KEYS.GET_ROWS_PREFIX(revisionId, tableId),
        version: ROW_CACHE_CONFIG.KEY_VERSION,
      }),
      ttl: ROW_CACHE_CONFIG.TTL,
      tags: [
        ROW_CACHE_TAGS.REVISION_RELATIVES(revisionId),
        ROW_CACHE_TAGS.TABLE_RELATIVES(revisionId, tableId),
        ROW_CACHE_TAGS.TABLE_GET_ROWS(revisionId, tableId),
      ],
      factory,
    });
  }

  public async invalidateTableRelatives({
    revisionId,
    tableId,
  }: {
    revisionId: string;
    tableId: string;
  }) {
    await this.cache.deleteByTag({
      tags: [ROW_CACHE_TAGS.TABLE_RELATIVES(revisionId, tableId)],
    });
  }

  public async invalidateRow({
    revisionId,
    tableId,
    rowId,
  }: {
    revisionId: string;
    tableId: string;
    rowId: string;
  }) {
    await this.cache.delete({
      key: ROW_CACHE_KEYS.ROW(revisionId, tableId, rowId),
    });
  }

  public async invalidateGetRows({
    revisionId,
    tableId,
  }: {
    revisionId: string;
    tableId: string;
  }) {
    await this.cache.deleteByTag({
      tags: [ROW_CACHE_TAGS.TABLE_GET_ROWS(revisionId, tableId)],
    });
  }

  public async invalidateRevisionRelatives(revisionId: string): Promise<void> {
    await this.cache.deleteByTag({
      tags: [ROW_CACHE_TAGS.REVISION_RELATIVES(revisionId)],
    });
  }
}
