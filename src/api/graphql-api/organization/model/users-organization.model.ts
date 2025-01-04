import { Field, ObjectType } from '@nestjs/graphql';
import { RoleModel } from 'src/api/graphql-api/role/model/role.model';
import { UserModel } from 'src/api/graphql-api/user/model/user.model';

@ObjectType()
export class UsersOrganizationModel {
  @Field()
  id: string;

  @Field()
  user: UserModel;

  @Field()
  role: RoleModel;
}
