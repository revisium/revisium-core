import { Field, ObjectType } from '@nestjs/graphql';
import { BranchModel } from 'src/api/graphql-api/branch/model/branch.model';
import { RevisionModel } from 'src/api/graphql-api/revision/model/revision.model';
import { Relation } from 'src/api/graphql-api/share/model/relation.type';

@ObjectType()
export class ParentBranchModel {
  @Field(() => BranchModel)
  branch: Relation<BranchModel>;

  @Field(() => RevisionModel)
  revision: Relation<RevisionModel>;
}
