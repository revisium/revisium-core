import { Field, ObjectType } from '@nestjs/graphql';
import { RoleModel } from 'src/api/graphql-api/role/model/role.model';

@ObjectType()
export class UserModel {
  @Field()
  id: string;

  @Field({ nullable: true })
  organizationId?: string;

  @Field({ nullable: true })
  username?: string;

  @Field({ nullable: true })
  email?: string;

  @Field(() => RoleModel)
  role: RoleModel;

  @Field()
  roleId: string;
}
