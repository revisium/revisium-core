import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CLEAN_COMMANDS_HANDLERS } from 'src/infrastructure/clean/commands/handlers';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { CleanService } from 'src/infrastructure/clean/clean.service';
import { FileStorageReconcileService } from 'src/infrastructure/clean/file-storage-reconcile.service';
import { StorageModule } from 'src/infrastructure/storage/storage.module';

@Module({
  imports: [CqrsModule, DatabaseModule, StorageModule],
  providers: [
    CleanService,
    FileStorageReconcileService,
    ...CLEAN_COMMANDS_HANDLERS,
  ],
})
export class CleanModule {}
