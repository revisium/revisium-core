import { Field, InputType } from '@nestjs/graphql';
import { UserOrganizationRoles } from 'src/auth/consts';

@InputType()
export class AddUserToOrganizationInput {
  @Field()
  organizationId: string;

  @Field()
  userId: string;

  @Field(() => UserOrganizationRoles)
  roleId: UserOrganizationRoles;
}
