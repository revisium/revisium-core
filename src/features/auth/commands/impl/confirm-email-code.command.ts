export class ConfirmEmailCodeCommand {
  public constructor(
    public readonly data: {
      code: string;
    },
  ) {}
}

export type ConfirmEmailCodeCommandData = ConfirmEmailCodeCommand['data'];

export type ConfirmEmailCodeCommandReturnType = { accessToken: string };
