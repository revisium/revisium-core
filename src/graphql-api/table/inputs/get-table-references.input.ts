import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetTableReferencesInput {
  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}
