import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RestoreProjectFileBytesResultModel {
  @Field(() => ID)
  projectId: string;

  @Field()
  previousFileBytes: string;

  @Field()
  nextFileBytes: string;

  @Field()
  drift: string;

  @Field()
  dryRun: boolean;
}
