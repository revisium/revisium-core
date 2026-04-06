import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';
import { RowRenamedEventHandler } from '../row-renamed.handler';
import { RowRenamedEvent } from 'src/infrastructure/cache/events';
import { InMemoryBentoCache } from '../../__tests__/in-memory-bento-cache';

describe('RowRenamedEventHandler (cache)', () => {
  const revisionId = 'rev-1';
  const tableId = 'table-1';
  const oldRowId = 'old-row';
  const newRowId = 'new-row';

  let bento: InMemoryBentoCache;
  let cacheService: CacheService;
  let rowCache: RowCacheService;
  let handler: RowRenamedEventHandler;

  beforeEach(() => {
    bento = new InMemoryBentoCache();
    cacheService = new CacheService(bento as any);
    rowCache = new RowCacheService(cacheService);
    handler = new RowRenamedEventHandler(rowCache);
  });

  it('should invalidate old row cache after rename', async () => {
    // Cache old row
    await rowCache.row({ revisionId, tableId, rowId: oldRowId }, () =>
      Promise.resolve({ id: oldRowId, data: { name: 'test' } }),
    );

    // Fire rename event
    await handler.handle(
      new RowRenamedEvent(revisionId, tableId, oldRowId, newRowId),
    );

    // Old row should re-execute factory (returns null — row no longer exists at old ID)
    const oldResult = await rowCache.row(
      { revisionId, tableId, rowId: oldRowId },
      () => Promise.resolve(null),
    );
    expect(oldResult).toBeNull();
  });

  it('should invalidate cached null for new row ID', async () => {
    // Cache null for new row ID (row doesn't exist yet)
    const cachedNull = await rowCache.row(
      { revisionId, tableId, rowId: newRowId },
      () => Promise.resolve(null),
    );
    expect(cachedNull).toBeNull();

    // Fire rename event
    await handler.handle(
      new RowRenamedEvent(revisionId, tableId, oldRowId, newRowId),
    );

    // New row ID should re-execute factory (now returns actual data)
    const newResult = await rowCache.row(
      { revisionId, tableId, rowId: newRowId },
      () => Promise.resolve({ id: newRowId, data: { name: 'test' } }),
    );
    expect(newResult).toEqual({ id: newRowId, data: { name: 'test' } });
  });

  it('should invalidate getRows cache after rename', async () => {
    // Cache getRows
    await rowCache.getRows(revisionId, tableId, {}, () =>
      Promise.resolve([{ id: oldRowId }]),
    );

    // Fire rename event
    await handler.handle(
      new RowRenamedEvent(revisionId, tableId, oldRowId, newRowId),
    );

    // getRows should re-execute factory with updated data
    const freshRows = await rowCache.getRows(revisionId, tableId, {}, () =>
      Promise.resolve([{ id: newRowId }]),
    );
    expect(freshRows).toEqual([{ id: newRowId }]);
  });
});
