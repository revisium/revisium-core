import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ShareModule } from 'src/features/share/share.module';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { SUB_SCHEMA_QUERIES_HANDLERS } from './queries/handlers';
import { SubSchemaApiService } from './sub-schema-api.service';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule, PluginModule],
  providers: [SubSchemaApiService, ...SUB_SCHEMA_QUERIES_HANDLERS],
  exports: [SubSchemaApiService],
})
export class SubSchemaModule {}
