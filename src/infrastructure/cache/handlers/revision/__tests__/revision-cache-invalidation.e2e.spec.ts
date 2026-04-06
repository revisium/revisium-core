import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { RowCacheService } from 'src/infrastructure/cache/services/row-cache.service';
import { RevisionCacheService } from 'src/infrastructure/cache/services/revision-cache.service';
import { RevisionCommittedEventHandler } from '../revision-committed.handler';
import { RevisionRevertedEventHandler } from '../revision-reverted.handler';
import {
  RevisionCommittedEvent,
  RevisionRevertedEvent,
} from 'src/infrastructure/cache/events';
import { InMemoryBentoCache } from '../../__tests__/in-memory-bento-cache';

describe('Revision cache invalidation', () => {
  let bento: InMemoryBentoCache;
  let cacheService: CacheService;
  let rowCache: RowCacheService;
  let revisionCache: RevisionCacheService;

  beforeEach(() => {
    bento = new InMemoryBentoCache();
    cacheService = new CacheService(bento as any);
    rowCache = new RowCacheService(cacheService);
    revisionCache = new RevisionCacheService(cacheService);
  });

  describe('RevisionCommittedEventHandler', () => {
    it('should invalidate revision cache for previous head and draft', async () => {
      const handler = new RevisionCommittedEventHandler(
        revisionCache,
        rowCache,
      );
      const prevHead = 'head-rev-1';
      const prevDraft = 'draft-rev-1';

      // Cache revisions
      await revisionCache.revision({ revisionId: prevHead }, () =>
        Promise.resolve({ id: prevHead, comment: 'old head' }),
      );
      await revisionCache.revision({ revisionId: prevDraft }, () =>
        Promise.resolve({ id: prevDraft, comment: 'old draft' }),
      );

      // Fire commit event
      await handler.handle(new RevisionCommittedEvent(prevHead, prevDraft));

      // Both should re-execute factory
      const freshHead = await revisionCache.revision(
        { revisionId: prevHead },
        () => Promise.resolve({ id: prevHead, comment: 'updated head' }),
      );
      expect(freshHead).toEqual({ id: prevHead, comment: 'updated head' });
    });

    it('should invalidate all row relatives in previous draft', async () => {
      const handler = new RevisionCommittedEventHandler(
        revisionCache,
        rowCache,
      );
      const prevDraft = 'draft-rev-1';

      // Cache rows in draft revision
      await rowCache.row(
        { revisionId: prevDraft, tableId: 'table-1', rowId: 'row-1' },
        () => Promise.resolve({ id: 'row-1' }),
      );

      // Fire commit
      await handler.handle(new RevisionCommittedEvent('head-rev-1', prevDraft));

      // Row cache should be invalidated
      const fresh = await rowCache.row(
        { revisionId: prevDraft, tableId: 'table-1', rowId: 'row-1' },
        () => Promise.resolve(null),
      );
      expect(fresh).toBeNull();
    });
  });

  describe('RevisionRevertedEventHandler', () => {
    it('should invalidate revision cache and all row relatives', async () => {
      const handler = new RevisionRevertedEventHandler(revisionCache, rowCache);
      const draftRevisionId = 'draft-rev-1';

      // Cache revision
      await revisionCache.revision({ revisionId: draftRevisionId }, () =>
        Promise.resolve({ id: draftRevisionId, comment: 'before revert' }),
      );

      // Cache rows in that revision
      await rowCache.row(
        { revisionId: draftRevisionId, tableId: 'table-1', rowId: 'row-1' },
        () => Promise.resolve({ id: 'row-1', data: { modified: true } }),
      );

      // Fire revert event
      await handler.handle(new RevisionRevertedEvent(draftRevisionId));

      // Revision cache should be invalidated
      const freshRev = await revisionCache.revision(
        { revisionId: draftRevisionId },
        () =>
          Promise.resolve({
            id: draftRevisionId,
            comment: 'after revert',
          }),
      );
      expect(freshRev).toEqual({
        id: draftRevisionId,
        comment: 'after revert',
      });

      // Row cache should be invalidated
      const freshRow = await rowCache.row(
        { revisionId: draftRevisionId, tableId: 'table-1', rowId: 'row-1' },
        () => Promise.resolve({ id: 'row-1', data: { modified: false } }),
      );
      expect(freshRow).toEqual({ id: 'row-1', data: { modified: false } });
    });
  });
});
