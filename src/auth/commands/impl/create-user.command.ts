import { UserSystemRoles } from 'src/auth/consts';

export class CreateUserCommand {
  constructor(
    public readonly data: {
      readonly username?: string;
      readonly password: string;
      readonly email?: string;
      readonly roleId: UserSystemRoles;
      readonly isEmailConfirmed: boolean;
      readonly emailCode?: string;
    },
  ) {}
}

export type CreateUserCommandReturnType = string;
