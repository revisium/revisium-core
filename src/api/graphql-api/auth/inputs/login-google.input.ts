import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LoginGoogleInput {
  @Field()
  redirectUrl: string;

  @Field()
  code: string;
}
