import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoginModel {
  @Field()
  accessToken: string;
}
