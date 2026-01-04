export class ResetPasswordCommand {
  constructor(
    public readonly data: {
      readonly userId: string;
      readonly newPassword: string;
    },
  ) {}
}

export type ResetPasswordCommandData = ResetPasswordCommand['data'];

export type ResetPasswordCommandReturnType = boolean;
