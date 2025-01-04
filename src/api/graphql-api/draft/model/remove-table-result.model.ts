import { Field, ObjectType } from '@nestjs/graphql';
import { BranchModel } from 'src/api/graphql-api/branch/model/branch.model';

@ObjectType()
export class RemoveTableResultModel {
  @Field(() => BranchModel)
  branch: BranchModel;
}
