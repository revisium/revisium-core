import { Field, ObjectType } from '@nestjs/graphql';
import { RowModel } from 'src/graphql-api/row/model/row.model';
import { TableModel } from 'src/graphql-api/table/model/table.model';

@ObjectType()
export class CreateRowResultModel {
  @Field(() => TableModel)
  table: TableModel;

  @Field()
  previousVersionTableId: string;

  @Field(() => RowModel)
  row: RowModel;
}
