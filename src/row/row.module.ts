import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/database/database.module';
import { ROW_QUERIES_HANDLERS } from 'src/row/queries/handlers';
import { ShareModule } from 'src/share/share.module';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule],
  providers: [...ROW_QUERIES_HANDLERS],
})
export class RowModule {}
