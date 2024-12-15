import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetRevisionTablesInput {
  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}
