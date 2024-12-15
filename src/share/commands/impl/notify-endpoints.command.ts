export class NotifyEndpointsCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
    },
  ) {}
}
