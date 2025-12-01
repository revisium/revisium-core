export class LoginCommand {
  constructor(
    public readonly data: {
      readonly emailOrUsername: string;
      readonly password: string;
    },
  ) {}
}

export type LoginCommandData = LoginCommand['data'];

export type LoginCommandReturnType = {
  accessToken: string;
};
