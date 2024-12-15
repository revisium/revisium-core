import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LoginInput {
  @Field()
  emailOrUsername: string;

  @Field()
  password: string;
}
