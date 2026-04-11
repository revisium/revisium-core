import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoginModel {
  @Field()
  accessToken: string;

  @Field(() => Int)
  expiresIn: number;
}
