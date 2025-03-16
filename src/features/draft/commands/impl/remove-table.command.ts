export class RemoveTableCommand {
  constructor(public data: { revisionId: string; tableId: string }) {}
}

export type RemoveTableCommandData = RemoveTableCommand['data'];
