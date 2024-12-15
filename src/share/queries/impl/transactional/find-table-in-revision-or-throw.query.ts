export class FindTableInRevisionOrThrowQuery {
  constructor(public readonly data: { revisionId: string; tableId: string }) {}
}
