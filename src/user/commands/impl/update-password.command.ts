export class UpdatePasswordCommand {
  constructor(
    public readonly data: {
      readonly userId: string;
      readonly oldPassword: string;
      readonly newPassword: string;
    },
  ) {}
}

export type UpdatePasswordCommandReturnType = boolean;
