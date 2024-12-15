import { Field, InputType } from '@nestjs/graphql';
import { UserProjectRoles } from 'src/auth/consts';

@InputType()
export class AddUserToProjectInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field()
  userId: string;

  @Field(() => UserProjectRoles)
  roleId: UserProjectRoles;
}
