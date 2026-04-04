export class RevokeApiKeyCommand {
  constructor(
    public readonly data: {
      readonly keyId: string;
    },
  ) {}
}

export type RevokeApiKeyCommandReturnType = void;
