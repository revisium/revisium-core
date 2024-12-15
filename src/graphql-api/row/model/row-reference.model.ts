import { Field, ObjectType } from '@nestjs/graphql';
import { RowModel } from 'src/graphql-api/row/model/row.model';
import { TableModel } from 'src/graphql-api/table/model/table.model';

@ObjectType()
export class RowReferenceModel {
  @Field(() => TableModel)
  table: TableModel;

  @Field(() => RowModel)
  row: RowModel;
}
