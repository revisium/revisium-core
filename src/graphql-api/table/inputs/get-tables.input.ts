import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetTablesInput {
  @Field()
  revisionId: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}
