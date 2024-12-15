import { Field, ObjectType } from '@nestjs/graphql';
import {
  BranchesConnection,
  BranchModel,
} from 'src/graphql-api/branch/model/branch.model';

@ObjectType()
export class ProjectModel {
  @Field()
  id: string;

  @Field()
  organizationId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field()
  name: string;

  @Field(() => Boolean)
  isPublic: boolean;

  @Field(() => BranchModel)
  rootBranch: BranchModel;

  @Field(() => BranchesConnection)
  allBranches: BranchesConnection;
}
