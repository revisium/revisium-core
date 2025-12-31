import { Prisma } from 'src/__generated__/client';

export interface DraftRevisionUpdateRowsRowData {
  rowId: string;
  data: Prisma.InputJsonValue;
  schemaHash?: string;
  meta?: Prisma.InputJsonValue;
  publishedAt?: Date;
}

export interface DraftRevisionUpdateRowsCommandData {
  revisionId: string;
  tableId: string;
  rows: DraftRevisionUpdateRowsRowData[];
}

export interface DraftRevisionUpdatedRowResult {
  rowVersionId: string;
  previousRowVersionId: string;
}

export interface DraftRevisionUpdateRowsCommandReturnType {
  tableVersionId: string;
  previousTableVersionId: string;
  updatedRows: DraftRevisionUpdatedRowResult[];
}

export class DraftRevisionUpdateRowsCommand {
  constructor(public readonly data: DraftRevisionUpdateRowsCommandData) {}
}
