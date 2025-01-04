import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LoginGithubInput {
  @Field()
  code: string;
}
