import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RevisionChangeSummaryModel {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  added: number;

  @Field(() => Int)
  modified: number;

  @Field(() => Int)
  removed: number;

  @Field(() => Int)
  renamed: number;
}

@ObjectType()
export class RevisionChangesModel {
  @Field()
  revisionId: string;

  @Field(() => String, { nullable: true })
  parentRevisionId: string | null;

  @Field(() => Int)
  totalChanges: number;

  @Field(() => RevisionChangeSummaryModel)
  tablesSummary: RevisionChangeSummaryModel;

  @Field(() => RevisionChangeSummaryModel)
  rowsSummary: RevisionChangeSummaryModel;

  @Field(() => Int)
  schemaChangesCount: number;

  @Field(() => Int)
  dataChangesCount: number;
}
