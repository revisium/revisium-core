export class ApiRemoveTableCommand {
  constructor(public data: { revisionId: string; tableId: string }) {}
}
