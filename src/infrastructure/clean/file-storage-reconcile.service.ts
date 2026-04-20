import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EngineApiService } from '@revisium/engine';
import {
  IStorageService,
  STORAGE_SERVICE,
} from 'src/infrastructure/storage/storage.interface';

const RECONCILE_BATCH_SIZE = 500;

@Injectable()
export class FileStorageReconcileService {
  private readonly logger = new Logger(FileStorageReconcileService.name);

  constructor(
    private readonly engine: EngineApiService,
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  public async sweepOrphanBlobs(): Promise<void> {
    const result = await this.engine.cleanupOrphanedFileBlobs();

    if (result.blobsTombstoned > 0) {
      this.logger.log(
        `tombstoned ${result.blobsTombstoned} orphan [FileBlob]s (${result.bytesFreed} bytes)`,
      );
    }

    await this.deleteAndConfirm(result.orphanHashes);
  }

  @Cron(CronExpression.EVERY_HOUR)
  public async reconcileStorage(): Promise<void> {
    if (!this.storage.isAvailable) {
      return;
    }

    const pending = await this.engine.getPendingStorageDeletions({
      limit: RECONCILE_BATCH_SIZE,
    });

    if (pending.length === 0) {
      return;
    }

    this.logger.log(
      `reconciling ${pending.length} pending storage deletion(s)`,
    );

    await this.deleteAndConfirm(pending.map((item) => item.hash));
  }

  private async deleteAndConfirm(hashes: readonly string[]): Promise<void> {
    if (hashes.length === 0) {
      return;
    }

    if (!this.storage.isAvailable) {
      return;
    }

    const confirmed: string[] = [];
    for (const hash of hashes) {
      try {
        await this.storage.deleteFile(hash);
        confirmed.push(hash);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `storage deleteFile failed for hash=${hash}: ${message}`,
        );
      }
    }

    if (confirmed.length === 0) {
      return;
    }

    const result = await this.engine.confirmStorageDeleted({
      hashes: confirmed,
    });

    if (result.blobsDeleted > 0) {
      this.logger.log(
        `confirmed ${result.hashesConfirmed} hash(es); hard-deleted ${result.blobsDeleted} tombstoned [FileBlob]s`,
      );
    }
  }
}
