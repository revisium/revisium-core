import { nanoid } from 'nanoid';
import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { FileStorageReconcileService } from 'src/infrastructure/clean/file-storage-reconcile.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import {
  IStorageService,
  STORAGE_SERVICE,
} from 'src/infrastructure/storage/storage.interface';

describe('FileStorageReconcileService', () => {
  let module: TestingModule;
  let service: FileStorageReconcileService;
  let prisma: PrismaService;
  let storageDeleteFile: jest.Mock;

  async function givenTombstonedBlob(): Promise<{
    projectId: string;
    hash: string;
  }> {
    const projectId = `proj-${nanoid()}`;
    const hash = nanoid();
    await prisma.fileBlob.create({
      data: {
        projectId,
        hash,
        size: 256n,
        deletedAt: new Date(),
      },
    });
    return { projectId, hash };
  }

  beforeAll(async () => {
    storageDeleteFile = jest.fn().mockResolvedValue(undefined);
    const inMemoryStorage: IStorageService = {
      isAvailable: true,
      canServeFiles: false,
      uploadFile: jest.fn(),
      getPublicUrl: () => '',
      deleteFile: (key) => storageDeleteFile(key),
    };

    module = await Test.createTestingModule({
      imports: [
        CoreModule.forRoot({ mode: 'monolith', storage: inMemoryStorage }),
      ],
    })
      .overrideProvider(STORAGE_SERVICE)
      .useValue(inMemoryStorage)
      .compile();

    await module.init();

    prisma = module.get(PrismaService);
    service = module.get(FileStorageReconcileService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    storageDeleteFile.mockReset();
    storageDeleteFile.mockResolvedValue(undefined);
  });

  it('reconcileStorage deletes tombstoned files from storage and hard-deletes the rows on confirm', async () => {
    const { projectId, hash } = await givenTombstonedBlob();

    await service.reconcileStorage();

    expect(storageDeleteFile).toHaveBeenCalledWith(hash);

    const remaining = await prisma.fileBlob.findUnique({
      where: { projectId_hash: { projectId, hash } },
    });
    expect(remaining).toBeNull();
  });

  it('leaves the tombstone in place when storage delete fails', async () => {
    const { projectId, hash } = await givenTombstonedBlob();
    storageDeleteFile.mockRejectedValue(new Error('S3 outage'));

    await service.reconcileStorage();

    const remaining = await prisma.fileBlob.findUnique({
      where: { projectId_hash: { projectId, hash } },
    });
    expect(remaining).not.toBeNull();
    expect(remaining?.deletedAt).not.toBeNull();
  });
});
