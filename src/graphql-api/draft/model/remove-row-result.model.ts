import { Field, ObjectType } from '@nestjs/graphql';
import { BranchModel } from 'src/graphql-api/branch/model/branch.model';
import { TableModel } from 'src/graphql-api/table/model/table.model';

@ObjectType()
export class RemoveRowResultModel {
  @Field(() => BranchModel)
  branch: BranchModel;

  @Field(() => TableModel, { nullable: true })
  table?: TableModel;

  @Field({ nullable: true })
  previousVersionTableId?: string;
}
