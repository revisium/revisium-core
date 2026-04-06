import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';
import { RowCreatedEventHandler } from '../row-created.handler';
import { RowUpdatedEventHandler } from '../row-updated.handler';
import { RowDeletedEventHandler } from '../row-deleted.handler';
import { RowsDeletedEventHandler } from '../rows-deleted.handler';
import {
  RowCreatedEvent,
  RowUpdatedEvent,
  RowDeletedEvent,
  RowsDeletedEvent,
} from 'src/infrastructure/cache/events';
import { InMemoryBentoCache } from '../../__tests__/in-memory-bento-cache';

describe('Row cache invalidation', () => {
  const revisionId = 'rev-1';
  const tableId = 'table-1';
  const rowId = 'row-1';

  let bento: InMemoryBentoCache;
  let cacheService: CacheService;
  let rowCache: RowCacheService;

  beforeEach(() => {
    bento = new InMemoryBentoCache();
    cacheService = new CacheService(bento as any);
    rowCache = new RowCacheService(cacheService);
  });

  describe('RowCreatedEventHandler', () => {
    it('should invalidate getRows cache after row created', async () => {
      const handler = new RowCreatedEventHandler(rowCache);

      // Cache a getRows result
      const cachedRows = await rowCache.getRows(revisionId, tableId, {}, () =>
        Promise.resolve([{ id: rowId }]),
      );
      expect(cachedRows).toEqual([{ id: rowId }]);

      // Fire event
      await handler.handle(new RowCreatedEvent(revisionId, tableId, 'new-row'));

      // getRows should re-execute factory
      const freshRows = await rowCache.getRows(revisionId, tableId, {}, () =>
        Promise.resolve([{ id: rowId }, { id: 'new-row' }]),
      );
      expect(freshRows).toEqual([{ id: rowId }, { id: 'new-row' }]);
    });
  });

  describe('RowUpdatedEventHandler', () => {
    it('should invalidate row cache and getRows cache', async () => {
      const handler = new RowUpdatedEventHandler(rowCache);

      // Cache individual row
      const cached = await rowCache.row({ revisionId, tableId, rowId }, () =>
        Promise.resolve({ id: rowId, data: { name: 'old' } }),
      );
      expect(cached).toEqual({ id: rowId, data: { name: 'old' } });

      // Fire event
      await handler.handle(new RowUpdatedEvent(revisionId, tableId, rowId));

      // Row should re-execute factory
      const fresh = await rowCache.row({ revisionId, tableId, rowId }, () =>
        Promise.resolve({ id: rowId, data: { name: 'new' } }),
      );
      expect(fresh).toEqual({ id: rowId, data: { name: 'new' } });
    });
  });

  describe('RowDeletedEventHandler', () => {
    it('should invalidate row cache and getRows cache', async () => {
      const handler = new RowDeletedEventHandler(rowCache);

      // Cache row
      await rowCache.row({ revisionId, tableId, rowId }, () =>
        Promise.resolve({ id: rowId }),
      );

      // Fire event
      await handler.handle(new RowDeletedEvent(revisionId, tableId, rowId));

      // Row should re-execute factory (returns null after delete)
      const fresh = await rowCache.row({ revisionId, tableId, rowId }, () =>
        Promise.resolve(null),
      );
      expect(fresh).toBeNull();
    });
  });

  describe('RowsDeletedEventHandler', () => {
    it('should invalidate multiple rows and getRows cache', async () => {
      const handler = new RowsDeletedEventHandler(rowCache);
      const rowIds = ['row-1', 'row-2', 'row-3'];

      // Cache rows
      for (const id of rowIds) {
        await rowCache.row({ revisionId, tableId, rowId: id }, () =>
          Promise.resolve({ id }),
        );
      }

      // Fire event
      await handler.handle(new RowsDeletedEvent(revisionId, tableId, rowIds));

      // All rows should re-execute factory
      for (const id of rowIds) {
        const fresh = await rowCache.row(
          { revisionId, tableId, rowId: id },
          () => Promise.resolve(null),
        );
        expect(fresh).toBeNull();
      }
    });
  });
});
