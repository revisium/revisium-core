import { Field, ObjectType } from '@nestjs/graphql';
import { TableModel } from 'src/graphql-api/table/model/table.model';

@ObjectType()
export class UpdateTableResultModel {
  @Field(() => TableModel)
  table: TableModel;

  @Field(() => TableModel)
  previousTable: TableModel;
}
