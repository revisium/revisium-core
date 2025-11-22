import { Field, ObjectType } from '@nestjs/graphql';
import { PermissionModel } from 'src/api/graphql-api/permission/model/permission.model';

@ObjectType()
export class RoleModel {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => [PermissionModel])
  permissions: PermissionModel[];
}
