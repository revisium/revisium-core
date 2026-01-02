import { Field, ObjectType } from '@nestjs/graphql';
import { RowModel } from 'src/api/graphql-api/row/model/row.model';
import { TableModel } from 'src/api/graphql-api/table/model/table.model';

@ObjectType()
export class PatchRowsResultModel {
  @Field(() => TableModel)
  table: TableModel;

  @Field()
  previousVersionTableId: string;

  @Field(() => [RowModel])
  rows: RowModel[];
}
