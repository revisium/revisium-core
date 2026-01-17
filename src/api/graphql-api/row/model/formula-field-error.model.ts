import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FormulaFieldErrorModel {
  @Field()
  field: string;

  @Field()
  expression: string;

  @Field()
  error: string;

  @Field(() => Boolean)
  defaultUsed: boolean;
}
