import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetRowsInput {
  @Field()
  revisionId: string;

  @Field()
  tableId: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}
