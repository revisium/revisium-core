export class LoginGithubCommand {
  public constructor(
    public readonly data: {
      code: string;
    },
  ) {}
}

export type LoginGithubCommandData = LoginGithubCommand['data'];

export type LoginGithubCommandReturnType = {
  accessToken: string;
};
