import { Field, ObjectType } from '@nestjs/graphql';
import { DateTimeResolver } from 'graphql-scalars';
import {
  BranchesConnection,
  BranchModel,
} from 'src/api/graphql-api/branch/model/branch.model';

@ObjectType()
export class ProjectModel {
  @Field()
  id: string;

  @Field()
  organizationId: string;

  @Field(() => DateTimeResolver)
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
