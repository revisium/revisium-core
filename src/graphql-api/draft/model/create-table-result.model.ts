import { Field, ObjectType } from '@nestjs/graphql';
import { BranchModel } from 'src/graphql-api/branch/model/branch.model';
import { TableModel } from 'src/graphql-api/table/model/table.model';

@ObjectType()
export class CreateTableResultModel {
  @Field(() => BranchModel)
  branch: BranchModel;

  @Field(() => TableModel)
  table: TableModel;
}
