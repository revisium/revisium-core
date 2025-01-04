import { Field, ObjectType } from '@nestjs/graphql';
import { ParentBranchModel } from 'src/api/graphql-api/branch/model/parent-branch.model';
import { ProjectModel } from 'src/api/graphql-api/project/model';
import {
  RevisionConnection,
  RevisionModel,
} from 'src/api/graphql-api/revision/model/revision.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';

@ObjectType()
export class BranchModel {
  @Field()
  id: string;

  @Field()
  projectId: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Boolean)
  isRoot: boolean;

  @Field(() => Boolean)
  touched: boolean;

  @Field()
  name: string;

  @Field(() => ParentBranchModel, { nullable: true })
  parent?: ParentBranchModel;

  @Field(() => ProjectModel)
  project: ProjectModel;

  @Field(() => RevisionModel)
  start: RevisionModel;

  @Field(() => RevisionModel)
  head: RevisionModel;

  @Field(() => RevisionModel)
  draft: RevisionModel;

  @Field(() => RevisionConnection)
  revisions: RevisionConnection;
}

@ObjectType()
export class BranchesConnection extends Paginated(BranchModel) {}
