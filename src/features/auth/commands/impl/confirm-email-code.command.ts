export class ConfirmEmailCodeCommand {
  public constructor(
    public readonly data: {
      code: string;
      ip?: string;
      userAgent?: string;
    },
  ) {}
}

export type ConfirmEmailCodeCommandData = ConfirmEmailCodeCommand['data'];

export type ConfirmEmailCodeCommandReturnType = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
};
