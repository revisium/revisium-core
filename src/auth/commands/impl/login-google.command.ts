export class LoginGoogleCommand {
  public constructor(
    public readonly data: {
      redirectUrl: string;
      code: string;
    },
  ) {}
}

export type LoginGoogleCommandReturnType = {
  accessToken: string;
};
