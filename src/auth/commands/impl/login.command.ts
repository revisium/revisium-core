export class LoginCommand {
  constructor(
    public readonly data: {
      readonly emailOrUsername: string;
      readonly password: string;
    },
  ) {}
}

export type LoginCommandReturnType = {
  accessToken: string;
};
