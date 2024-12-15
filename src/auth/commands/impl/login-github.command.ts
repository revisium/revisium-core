export class LoginGithubCommand {
  public constructor(
    public readonly data: {
      code: string;
    },
  ) {}
}

export type LoginGithubCommandReturnType = {
  accessToken: string;
};
