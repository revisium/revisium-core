export class FindRowsInTableOrThrowQuery {
  constructor(
    public readonly data: { tableVersionId: string; rowIds: string[] },
  ) {}
}
