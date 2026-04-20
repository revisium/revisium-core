import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { EngineApiService } from '@revisium/engine';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { UploadFileCommand } from 'src/features/row/commands/impl/upload-file.command';
import { UploadFileHandler } from '../upload-file.handler';

describe('UploadFileHandler', () => {
  it('uploads the file and invalidates row caches', async () => {
    const result = { row: { id: 'row-1' } };
    engine.uploadFile.mockResolvedValue(result);

    const command = new UploadFileCommand({
      revisionId: 'rev-1',
      tableId: 'table-1',
      rowId: 'row-1',
      fileId: 'file-1',
      file: {
        size: 123,
      } as Express.Multer.File,
    });

    await expect(handler.execute(command)).resolves.toBe(result);

    expect(billingCheck.check).toHaveBeenCalledWith(
      'rev-1',
      LimitMetric.STORAGE_BYTES,
      123,
    );
    expect(engine.uploadFile).toHaveBeenCalledWith(command.data);
    expect(eventBus.publishAll).toHaveBeenCalledWith([
      expect.objectContaining({
        revisionId: 'rev-1',
        tableId: 'table-1',
        rowId: 'row-1',
      }),
    ]);
  });

  it('does not publish events when upload fails', async () => {
    engine.uploadFile.mockRejectedValue(new Error('upload failed'));

    const command = new UploadFileCommand({
      revisionId: 'rev-1',
      tableId: 'table-1',
      rowId: 'row-1',
      fileId: 'file-1',
      file: {
        size: 456,
      } as Express.Multer.File,
    });

    await expect(handler.execute(command)).rejects.toThrow('upload failed');

    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  let handler: UploadFileHandler;
  let engine: { uploadFile: jest.Mock };
  let eventBus: { publishAll: jest.Mock };
  let billingCheck: { check: jest.Mock };

  beforeEach(async () => {
    engine = {
      uploadFile: jest.fn(),
    };
    eventBus = {
      publishAll: jest.fn(),
    };
    billingCheck = {
      check: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadFileHandler,
        { provide: EngineApiService, useValue: engine },
        { provide: EventBus, useValue: eventBus },
        { provide: BillingCheckService, useValue: billingCheck },
      ],
    }).compile();

    handler = module.get(UploadFileHandler);
  });
});
