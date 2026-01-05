import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AdminUserInput {
  @Field()
  userId: string;
}
