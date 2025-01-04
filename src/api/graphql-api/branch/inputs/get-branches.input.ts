import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetBranchesInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}
