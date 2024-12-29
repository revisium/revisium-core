import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetProjectsInput {
  @Field()
  organizationId: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}