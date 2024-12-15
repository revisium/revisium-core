import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RoleModel {
  @Field()
  id: string;

  @Field()
  name: string;
}
