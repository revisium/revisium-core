import { EngineApiService } from '@revisium/engine';
import { FileStorageReconcileService } from 'src/infrastructure/clean/file-storage-reconcile.service';
import { IStorageService } from 'src/infrastructure/storage/storage.interface';

type EngineStub = Pick<
  EngineApiService,
  | 'cleanupOrphanedFileBlobs'
  | 'getPendingStorageDeletions'
  | 'confirmStorageDeleted'
>;

const makeStorage = (
  overrides: Partial<IStorageService> = {},
): jest.Mocked<IStorageService> =>
  ({
    isAvailable: true,
    canServeFiles: false,
    uploadFile: jest.fn(),
    getPublicUrl: jest.fn().mockReturnValue(''),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as jest.Mocked<IStorageService>;

const makeEngine = (
  overrides: Partial<EngineStub> = {},
): jest.Mocked<EngineStub> =>
  ({
    cleanupOrphanedFileBlobs: jest.fn().mockResolvedValue({
      blobsTombstoned: 0,
      bytesFreed: 0,
      orphanHashes: [],
    }),
    getPendingStorageDeletions: jest.fn().mockResolvedValue([]),
    confirmStorageDeleted: jest
      .fn()
      .mockResolvedValue({ hashesConfirmed: 0, blobsDeleted: 0 }),
    ...overrides,
  }) as jest.Mocked<EngineStub>;

const makeService = (
  engine: jest.Mocked<EngineStub>,
  storage: jest.Mocked<IStorageService>,
): FileStorageReconcileService =>
  new FileStorageReconcileService(
    engine as unknown as EngineApiService,
    storage,
  );

describe('FileStorageReconcileService (unit)', () => {
  describe('sweepOrphanBlobs', () => {
    it('logs the tombstoned count when blobsTombstoned > 0 and forwards orphan hashes', async () => {
      const engine = makeEngine({
        cleanupOrphanedFileBlobs: jest.fn().mockResolvedValue({
          blobsTombstoned: 3,
          bytesFreed: 4096,
          orphanHashes: ['h1', 'h2'],
        }),
        confirmStorageDeleted: jest
          .fn()
          .mockResolvedValue({ hashesConfirmed: 2, blobsDeleted: 2 }),
      });
      const storage = makeStorage();
      const service = makeService(engine, storage);

      await service.sweepOrphanBlobs();

      expect(engine.cleanupOrphanedFileBlobs).toHaveBeenCalledTimes(1);
      expect(storage.deleteFile).toHaveBeenCalledTimes(2);
      expect(storage.deleteFile).toHaveBeenNthCalledWith(1, 'h1');
      expect(storage.deleteFile).toHaveBeenNthCalledWith(2, 'h2');
      expect(engine.confirmStorageDeleted).toHaveBeenCalledWith({
        hashes: ['h1', 'h2'],
      });
    });

    it('skips the log when no blobs were tombstoned and skips delete when there are no orphan hashes', async () => {
      const engine = makeEngine();
      const storage = makeStorage();
      const service = makeService(engine, storage);

      await service.sweepOrphanBlobs();

      expect(engine.cleanupOrphanedFileBlobs).toHaveBeenCalledTimes(1);
      expect(storage.deleteFile).not.toHaveBeenCalled();
      expect(engine.confirmStorageDeleted).not.toHaveBeenCalled();
    });
  });

  describe('reconcileStorage', () => {
    it('returns early when storage is not available, without touching the engine', async () => {
      const engine = makeEngine();
      const storage = makeStorage({ isAvailable: false });
      const service = makeService(engine, storage);

      await service.reconcileStorage();

      expect(engine.getPendingStorageDeletions).not.toHaveBeenCalled();
      expect(storage.deleteFile).not.toHaveBeenCalled();
    });

    it('returns early when no pending deletions are reported', async () => {
      const engine = makeEngine();
      const storage = makeStorage();
      const service = makeService(engine, storage);

      await service.reconcileStorage();

      expect(engine.getPendingStorageDeletions).toHaveBeenCalledWith({
        limit: 500,
      });
      expect(storage.deleteFile).not.toHaveBeenCalled();
      expect(engine.confirmStorageDeleted).not.toHaveBeenCalled();
    });

    it('deletes pending hashes and confirms only the ones that succeeded', async () => {
      const engine = makeEngine({
        getPendingStorageDeletions: jest
          .fn()
          .mockResolvedValue([{ hash: 'a' }, { hash: 'b' }, { hash: 'c' }]),
        confirmStorageDeleted: jest
          .fn()
          .mockResolvedValue({ hashesConfirmed: 2, blobsDeleted: 2 }),
      });
      const storage = makeStorage({
        deleteFile: jest
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('S3 outage'))
          .mockResolvedValueOnce(undefined),
      });
      const service = makeService(engine, storage);

      await service.reconcileStorage();

      expect(storage.deleteFile).toHaveBeenCalledTimes(3);
      expect(engine.confirmStorageDeleted).toHaveBeenCalledWith({
        hashes: ['a', 'c'],
      });
    });

    it('skips the engine confirm call when every storage delete fails', async () => {
      const engine = makeEngine({
        getPendingStorageDeletions: jest
          .fn()
          .mockResolvedValue([{ hash: 'a' }]),
      });
      const storage = makeStorage({
        deleteFile: jest.fn().mockRejectedValue('non-error throwable'),
      });
      const service = makeService(engine, storage);

      await service.reconcileStorage();

      expect(storage.deleteFile).toHaveBeenCalledWith('a');
      expect(engine.confirmStorageDeleted).not.toHaveBeenCalled();
    });
  });

  describe('deleteAndConfirm (via sweepOrphanBlobs)', () => {
    it('does nothing when storage becomes unavailable between checks', async () => {
      const engine = makeEngine({
        cleanupOrphanedFileBlobs: jest.fn().mockResolvedValue({
          blobsTombstoned: 0,
          bytesFreed: 0,
          orphanHashes: ['h1'],
        }),
      });
      const storage = makeStorage({ isAvailable: false });
      const service = makeService(engine, storage);

      await service.sweepOrphanBlobs();

      expect(storage.deleteFile).not.toHaveBeenCalled();
      expect(engine.confirmStorageDeleted).not.toHaveBeenCalled();
    });

    it('runs the no-op confirm branch when blobsDeleted is 0 after a successful delete', async () => {
      const engine = makeEngine({
        cleanupOrphanedFileBlobs: jest.fn().mockResolvedValue({
          blobsTombstoned: 0,
          bytesFreed: 0,
          orphanHashes: ['h1'],
        }),
        confirmStorageDeleted: jest
          .fn()
          .mockResolvedValue({ hashesConfirmed: 1, blobsDeleted: 0 }),
      });
      const storage = makeStorage();
      const service = makeService(engine, storage);

      await service.sweepOrphanBlobs();

      expect(storage.deleteFile).toHaveBeenCalledWith('h1');
      expect(engine.confirmStorageDeleted).toHaveBeenCalledWith({
        hashes: ['h1'],
      });
    });
  });
});
