export class RotateApiKeyCommand {
  constructor(
    public readonly data: {
      readonly keyId: string;
    },
  ) {}
}

export type RotateApiKeyCommandReturnType = {
  id: string;
  key: string;
};
