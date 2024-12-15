import { Field, ObjectType } from '@nestjs/graphql';
import { BranchModel } from 'src/graphql-api/branch/model/branch.model';
import { RevisionModel } from 'src/graphql-api/revision/model/revision.model';

@ObjectType()
export class ParentBranchModel {
  @Field(() => BranchModel)
  branch: BranchModel;

  @Field(() => RevisionModel)
  revision: RevisionModel;
}
