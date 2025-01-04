export class ConfirmEmailCodeCommand {
  public constructor(
    public readonly data: {
      code: string;
    },
  ) {}
}

export type ConfirmEmailCodeCommandReturnType = { accessToken: string };
