import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';
import { TableSchemaUpdatedEventHandler } from '../table-schema-updated.handler';
import { TableDeletedEventHandler } from '../table-deleted.handler';
import {
  TableSchemaUpdatedEvent,
  TableDeletedEvent,
} from 'src/infrastructure/cache/events';
import { InMemoryBentoCache } from 'src/testing/infrastructure/cache/in-memory-bento-cache';

describe('Table cache invalidation', () => {
  const revisionId = 'rev-1';
  const tableId = 'table-1';

  let bento: InMemoryBentoCache;
  let cacheService: CacheService;
  let rowCache: RowCacheService;

  beforeEach(() => {
    bento = new InMemoryBentoCache();
    cacheService = new CacheService(bento as any);
    rowCache = new RowCacheService(cacheService);
  });

  describe('TableSchemaUpdatedEventHandler', () => {
    it('should invalidate all table relatives', async () => {
      const handler = new TableSchemaUpdatedEventHandler(rowCache);

      // Cache rows in the table
      await rowCache.row({ revisionId, tableId, rowId: 'row-1' }, () =>
        Promise.resolve({ id: 'row-1' }),
      );
      await rowCache.row({ revisionId, tableId, rowId: 'row-2' }, () =>
        Promise.resolve({ id: 'row-2' }),
      );
      await rowCache.getRows(revisionId, tableId, {}, () =>
        Promise.resolve([{ id: 'row-1' }, { id: 'row-2' }]),
      );

      // Fire event
      await handler.handle(new TableSchemaUpdatedEvent(revisionId, tableId));

      // All cached data for this table should be invalidated
      const freshRow = await rowCache.row(
        { revisionId, tableId, rowId: 'row-1' },
        () => Promise.resolve({ id: 'row-1', data: { updated: true } }),
      );
      expect(freshRow).toEqual({ id: 'row-1', data: { updated: true } });
    });
  });

  describe('TableDeletedEventHandler', () => {
    it('should invalidate all table relatives', async () => {
      const handler = new TableDeletedEventHandler(rowCache);

      // Cache rows
      await rowCache.row({ revisionId, tableId, rowId: 'row-1' }, () =>
        Promise.resolve({ id: 'row-1' }),
      );

      // Fire event
      await handler.handle(new TableDeletedEvent(revisionId, tableId));

      // Cache should be cleared
      const fresh = await rowCache.row(
        { revisionId, tableId, rowId: 'row-1' },
        () => Promise.resolve(null),
      );
      expect(fresh).toBeNull();
    });
  });
});
