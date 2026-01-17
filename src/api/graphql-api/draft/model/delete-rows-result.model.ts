import { Field, ObjectType } from '@nestjs/graphql';
import { BranchModel } from 'src/api/graphql-api/branch/model/branch.model';
import { TableModel } from 'src/api/graphql-api/table/model/table.model';

@ObjectType()
export class DeleteRowsResultModel {
  @Field(() => BranchModel)
  branch: BranchModel;

  @Field(() => TableModel, { nullable: true })
  table?: TableModel;

  @Field({ nullable: true })
  previousVersionTableId?: string;
}
