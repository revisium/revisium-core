export class SetUsernameCommand {
  constructor(
    public readonly data: {
      readonly userId: string;
      readonly username: string;
    },
  ) {}
}

export type SetUsernameCommandReturnType = boolean;
