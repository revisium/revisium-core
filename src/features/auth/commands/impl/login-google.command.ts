export class LoginGoogleCommand {
  public constructor(
    public readonly data: {
      redirectUrl: string;
      code: string;
    },
  ) {}
}

export type LoginGoogleCommandData = LoginGoogleCommand['data'];

export type LoginGoogleCommandReturnType = {
  accessToken: string;
};
