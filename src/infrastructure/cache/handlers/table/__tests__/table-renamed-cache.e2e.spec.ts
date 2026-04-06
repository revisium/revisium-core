import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';
import { TableRenamedEventHandler } from '../table-renamed.handler';
import { TableRenamedEvent } from 'src/infrastructure/cache/events';
import { InMemoryBentoCache } from '../../__tests__/in-memory-bento-cache';

describe('TableRenamedEventHandler (cache)', () => {
  const revisionId = 'rev-1';
  const oldTableId = 'old-table';
  const newTableId = 'new-table';

  let bento: InMemoryBentoCache;
  let cacheService: CacheService;
  let rowCache: RowCacheService;
  let handler: TableRenamedEventHandler;

  beforeEach(() => {
    bento = new InMemoryBentoCache();
    cacheService = new CacheService(bento as any);
    rowCache = new RowCacheService(cacheService);
    handler = new TableRenamedEventHandler(rowCache);
  });

  it('should invalidate all rows cached under old table ID', async () => {
    // Cache rows under old table
    await rowCache.row(
      { revisionId, tableId: oldTableId, rowId: 'row-1' },
      () => Promise.resolve({ id: 'row-1', data: { name: 'test' } }),
    );
    await rowCache.getRows(revisionId, oldTableId, {}, () =>
      Promise.resolve([{ id: 'row-1' }]),
    );

    // Fire rename event
    await handler.handle(
      new TableRenamedEvent(revisionId, oldTableId, newTableId),
    );

    // Old table rows should be invalidated
    const freshOld = await rowCache.row(
      { revisionId, tableId: oldTableId, rowId: 'row-1' },
      () => Promise.resolve(null),
    );
    expect(freshOld).toBeNull();
  });

  it('should invalidate cached nulls under new table ID', async () => {
    // Cache null row under new table (table didn't exist before)
    const cachedNull = await rowCache.row(
      { revisionId, tableId: newTableId, rowId: 'row-1' },
      () => Promise.resolve(null),
    );
    expect(cachedNull).toBeNull();

    // Fire rename event
    await handler.handle(
      new TableRenamedEvent(revisionId, oldTableId, newTableId),
    );

    // New table should re-execute factory (row now exists under new table)
    const fresh = await rowCache.row(
      { revisionId, tableId: newTableId, rowId: 'row-1' },
      () => Promise.resolve({ id: 'row-1', data: { name: 'test' } }),
    );
    expect(fresh).toEqual({ id: 'row-1', data: { name: 'test' } });
  });

  it('should invalidate getRows for both old and new table IDs', async () => {
    // Cache getRows for old table
    await rowCache.getRows(revisionId, oldTableId, {}, () =>
      Promise.resolve([{ id: 'row-1' }]),
    );
    // Cache empty getRows for new table
    await rowCache.getRows(revisionId, newTableId, {}, () =>
      Promise.resolve([]),
    );

    // Fire rename event
    await handler.handle(
      new TableRenamedEvent(revisionId, oldTableId, newTableId),
    );

    // Old table getRows should re-execute
    const freshOldRows = await rowCache.getRows(
      revisionId,
      oldTableId,
      {},
      () => Promise.resolve([]),
    );
    expect(freshOldRows).toEqual([]);

    // New table getRows should re-execute
    const freshNewRows = await rowCache.getRows(
      revisionId,
      newTableId,
      {},
      () => Promise.resolve([{ id: 'row-1' }]),
    );
    expect(freshNewRows).toEqual([{ id: 'row-1' }]);
  });
});
