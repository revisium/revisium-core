import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetBranchRevisionsInput {
  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;

  @Field({ nullable: true })
  before?: string;

  @Field(() => Boolean, { nullable: true })
  inclusive?: boolean;

  @Field({ nullable: true })
  comment?: string;
}
