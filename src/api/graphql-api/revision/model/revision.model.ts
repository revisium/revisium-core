import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BranchModel } from 'src/api/graphql-api/branch/model/branch.model';
import { EndpointModel } from 'src/api/graphql-api/endpoint/model';
import { ChildBranchModel } from 'src/api/graphql-api/revision/model/child-branch.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';
import { TablesConnection } from 'src/api/graphql-api/table/model/table-connection.model';

@ObjectType()
export class RevisionModel {
  @Field()
  id: string;

  @Field(() => Int)
  sequence: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Boolean)
  isStart: boolean;

  @Field(() => Boolean)
  isHead: boolean;

  @Field(() => Boolean)
  isDraft: boolean;

  @Field()
  comment: string;

  @Field(() => RevisionModel, { nullable: true })
  parent?: RevisionModel;

  @Field(() => RevisionModel, { nullable: true })
  child?: RevisionModel;

  @Field(() => [ChildBranchModel])
  childBranches: ChildBranchModel[];

  @Field(() => [RevisionModel])
  children: RevisionModel[];

  @Field(() => TablesConnection)
  tables: TablesConnection;

  @Field(() => BranchModel)
  branch: BranchModel;

  @Field(() => [EndpointModel])
  endpoints: EndpointModel[];
}

@ObjectType()
export class RevisionConnection extends Paginated(RevisionModel) {}
