import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ROW_QUERIES_HANDLERS } from 'src/features/row/queries/handlers';
import { ShareModule } from 'src/features/share/share.module';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule],
  providers: [...ROW_QUERIES_HANDLERS],
})
export class RowModule {}
