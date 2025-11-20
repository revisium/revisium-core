import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class SearchUsersInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}
