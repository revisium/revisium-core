import { Field, ObjectType } from '@nestjs/graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { ParentBranchModel } from 'src/api/graphql-api/branch/model/parent-branch.model';
import { ProjectModel } from 'src/api/graphql-api/project/model';
import {
  RevisionConnection,
  RevisionModel,
} from 'src/api/graphql-api/revision/model/revision.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';
import { Relation } from 'src/api/graphql-api/share/model/relation.type';

@ObjectType()
export class BranchModel {
  @Field()
  id: string;

  @Field()
  projectId: string;

  @Field(() => DateTimeResolver)
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
  project: Relation<ProjectModel>;

  @Field(() => RevisionModel)
  start: Relation<RevisionModel>;

  @Field(() => RevisionModel)
  head: Relation<RevisionModel>;

  @Field(() => RevisionModel)
  draft: Relation<RevisionModel>;

  @Field(() => RevisionConnection)
  revisions: Relation<RevisionConnection>;
}

@ObjectType()
export class BranchesConnection extends Paginated(BranchModel) {}
