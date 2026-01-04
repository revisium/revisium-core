import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ResetPasswordInput {
  @Field() userId: string;

  @Field() newPassword: string;
}
