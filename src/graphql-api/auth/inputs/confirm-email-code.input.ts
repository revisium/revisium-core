import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ConfirmEmailCodeInput {
  @Field()
  code: string;
}
