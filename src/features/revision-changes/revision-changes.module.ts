import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import {
  RowDiffService,
  SchemaImpactService,
  RevisionComparisonService,
} from './services';
import {
  GetRevisionChangesHandler,
  GetRowChangesHandler,
  GetTableChangesHandler,
} from './queries/handlers';
import { ShareModule } from 'src/features/share/share.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { TableChangeMapper } from './mappers/table-change.mapper';
import { RowChangeMapper } from './mappers/row-change.mapper';
import { RevisionChangesApiService } from './revision-changes-api.service';

const queryHandlers = [
  GetRevisionChangesHandler,
  GetRowChangesHandler,
  GetTableChangesHandler,
];

const services = [
  RowDiffService,
  SchemaImpactService,
  RevisionComparisonService,
];

const mappers = [TableChangeMapper, RowChangeMapper];

@Module({
  imports: [CqrsModule, ShareModule, DatabaseModule],
  providers: [
    ...queryHandlers,
    ...services,
    ...mappers,
    RevisionChangesApiService,
  ],
  exports: [RevisionChangesApiService],
})
export class RevisionChangesModule {}
