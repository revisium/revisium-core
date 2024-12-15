export class SignUpCommand {
  public constructor(
    public readonly data: {
      email: string;
      username: string;
      password: string;
    },
  ) {}
}

export type SignUpCommandReturnType = boolean;
