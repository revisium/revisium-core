export class ActivateEarlyAccessCommand {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly planId: string;
    },
  ) {}
}
