import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CLEAN_COMMANDS_HANDLERS } from 'src/infrastructure/clean/commands/handlers';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { CleanService } from 'src/infrastructure/clean/clean.service';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [CleanService, ...CLEAN_COMMANDS_HANDLERS],
})
export class CleanModule {}
