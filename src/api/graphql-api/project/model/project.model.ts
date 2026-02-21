import { Field, ObjectType } from '@nestjs/graphql';
import { DateTimeResolver } from 'graphql-scalars';
import {
  BranchesConnection,
  BranchModel,
} from 'src/api/graphql-api/branch/model/branch.model';
import { OrganizationModel } from 'src/api/graphql-api/organization/model/organization.model';
import { UsersProjectModel } from 'src/api/graphql-api/project/model/users-project.model';
import { Relation } from 'src/api/graphql-api/share/model/relation.type';

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

  @Field(() => OrganizationModel)
  organization: OrganizationModel;

  @Field(() => BranchModel)
  rootBranch: Relation<BranchModel>;

  @Field(() => BranchesConnection)
  allBranches: Relation<BranchesConnection>;

  @Field(() => UsersProjectModel, { nullable: true })
  userProject?: UsersProjectModel;
}
