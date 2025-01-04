import { Field, InputType } from '@nestjs/graphql';
import { UserSystemRoles } from 'src/features/auth/consts';

@InputType()
export class CreateUserInput {
  @Field()
  username: string;

  @Field(() => UserSystemRoles)
  roleId: UserSystemRoles;

  @Field()
  password: string;

  @Field({ nullable: true })
  email?: string;
}
