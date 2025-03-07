import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class GetRowForeignKeysInput {
  @Field()
  foreignKeyTableId: string;

  @Field(() => Int)
  first: number;

  @Field({ nullable: true })
  after?: string;
}
