import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SharedModule } from 'src/core/shared/shared.module';
import { TableApiService } from './table-api.service';
import { TABLE_COMMAND_HANDLERS } from './commands/handlers';

@Module({
  imports: [CqrsModule, SharedModule],
  providers: [TableApiService, ...TABLE_COMMAND_HANDLERS],
  exports: [TableApiService],
})
export class TableModule {}
