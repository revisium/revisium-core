export class MoveEndpointsCommand {
  constructor(
    public readonly data: { fromRevisionId: string; toRevisionId: string },
  ) {}
}
