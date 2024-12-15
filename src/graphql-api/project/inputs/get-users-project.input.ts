import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetUsersProjectInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}
