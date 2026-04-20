import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProjectFileUsageReportModel {
  @Field(() => ID)
  projectId: string;

  @Field()
  currentFileBytes: string;

  @Field()
  expectedFileBytes: string;

  @Field()
  drift: string;

  @Field(() => Int)
  fileBlobCount: number;

  @Field(() => Int)
  referenceCount: number;
}
