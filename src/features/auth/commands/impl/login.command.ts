export class LoginCommand {
  constructor(
    public readonly data: {
      readonly emailOrUsername: string;
      readonly password: string;
      readonly ip?: string;
      readonly userAgent?: string;
    },
  ) {}
}

export type LoginCommandData = LoginCommand['data'];

export type LoginCommandReturnType = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
};
