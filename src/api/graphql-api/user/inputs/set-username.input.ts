import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SetUsernameInput {
  @Field()
  username: string;
}
