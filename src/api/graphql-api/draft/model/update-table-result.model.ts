import { Field, ObjectType } from '@nestjs/graphql';
import { TableModel } from 'src/api/graphql-api/table/model/table.model';

@ObjectType()
export class UpdateTableResultModel {
  @Field(() => TableModel)
  table: TableModel;

  @Field()
  previousVersionTableId: string;
}
