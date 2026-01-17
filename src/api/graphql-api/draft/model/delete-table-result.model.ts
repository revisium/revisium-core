import { Field, ObjectType } from '@nestjs/graphql';
import { BranchModel } from 'src/api/graphql-api/branch/model/branch.model';

@ObjectType()
export class DeleteTableResultModel {
  @Field(() => BranchModel)
  branch: BranchModel;
}
