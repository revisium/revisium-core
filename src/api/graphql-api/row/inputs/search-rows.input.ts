import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class SearchRowsInput {
  @Field()
  revisionId: string;

  @Field()
  query: string;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  first?: number;

  @Field(() => String, { nullable: true })
  after?: string;
}
