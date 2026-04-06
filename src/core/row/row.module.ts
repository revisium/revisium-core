import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SharedModule } from 'src/core/shared/shared.module';
import { RowApiService } from './row-api.service';
import { ROW_COMMAND_HANDLERS } from './commands/handlers';

@Module({
  imports: [CqrsModule, SharedModule],
  providers: [RowApiService, ...ROW_COMMAND_HANDLERS],
  exports: [RowApiService],
})
export class RowModule {}
