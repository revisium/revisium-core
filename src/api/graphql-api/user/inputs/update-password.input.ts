import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdatePasswordInput {
  @Field() oldPassword: string;

  @Field() newPassword: string;
}
