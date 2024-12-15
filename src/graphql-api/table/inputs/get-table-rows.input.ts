import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetTableRowsInput {
  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}
