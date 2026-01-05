import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SearchUserModel {
  @Field()
  id: string;

  @Field({ nullable: true })
  username?: string;

  @Field({ nullable: true })
  email?: string;
}
