import { Field, ObjectType } from '@nestjs/graphql';
import { BranchModel } from 'src/api/graphql-api/branch/model/branch.model';
import { RevisionModel } from 'src/api/graphql-api/revision/model/revision.model';

@ObjectType()
export class ParentBranchModel {
  @Field(() => BranchModel)
  branch: BranchModel;

  @Field(() => RevisionModel)
  revision: RevisionModel;
}
