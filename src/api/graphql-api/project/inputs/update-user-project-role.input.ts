import { Field, InputType } from '@nestjs/graphql';
import { UserProjectRoles } from 'src/features/auth/consts';

@InputType()
export class UpdateUserProjectRoleInput {
  @Field()
  organizationId: string;

  @Field()
  projectName: string;

  @Field()
  userId: string;

  @Field(() => UserProjectRoles)
  roleId: UserProjectRoles;
}
