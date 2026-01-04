import { Field, ObjectType } from '@nestjs/graphql';
import { OrganizationModel } from 'src/api/graphql-api/organization/model/organization.model';
import { RoleModel } from 'src/api/graphql-api/role/model/role.model';

@ObjectType()
export class MeModel {
  @Field()
  id: string;

  @Field({ nullable: true })
  organizationId?: string;

  @Field({ nullable: true })
  username?: string;

  @Field({ nullable: true })
  email?: string;

  @Field()
  hasPassword: boolean;

  @Field(() => RoleModel, { nullable: true })
  role?: RoleModel;

  @Field(() => OrganizationModel, { nullable: true })
  organization?: OrganizationModel;

  roleId?: string;
}
