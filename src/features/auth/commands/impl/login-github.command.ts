export class LoginGithubCommand {
  public constructor(
    public readonly data: {
      code: string;
      ip?: string;
      userAgent?: string;
    },
  ) {}
}

export type LoginGithubCommandData = LoginGithubCommand['data'];

export type LoginGithubCommandReturnType = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
};
