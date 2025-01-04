export class FindRowInTableOrThrowQuery {
  constructor(
    public readonly data: { tableVersionId: string; rowId: string },
  ) {}
}
