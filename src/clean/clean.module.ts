import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CLEAN_COMMANDS_HANDLERS } from 'src/clean/commands/handlers';
import { DatabaseModule } from 'src/database/database.module';
import { CleanService } from './clean.service';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [CleanService, ...CLEAN_COMMANDS_HANDLERS],
})
export class CleanModule {}
