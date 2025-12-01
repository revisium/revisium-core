export class GetCountRowsInTableQuery {
  constructor(public readonly data: { readonly tableVersionId: string }) {}
}

export type GetCountRowsInTableQueryData = GetCountRowsInTableQuery['data'];

export type GetCountRowsInTableQueryReturnType = number;
