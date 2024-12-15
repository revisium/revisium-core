import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetRowReferencesInput {
  @Field()
  referenceTableId: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}
