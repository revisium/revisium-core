import { Field, ObjectType } from '@nestjs/graphql';
import { RoleModel } from 'src/graphql-api/role/model/role.model';
import { UserModel } from 'src/graphql-api/user/model/user.model';

@ObjectType()
export class UsersProjectModel {
  @Field()
  id: string;

  @Field()
  user: UserModel;

  @Field()
  role: RoleModel;
}
