import { Prisma } from 'src/__generated__/client';

export interface DraftRevisionCreateRowsRowData {
  rowId: string;
  data: Prisma.InputJsonValue;
  schemaHash?: string;
  meta?: Prisma.InputJsonValue;
  publishedAt?: Date;
}

export interface DraftRevisionCreateRowsCommandData {
  revisionId: string;
  tableId: string;
  rows: DraftRevisionCreateRowsRowData[];
}

export interface DraftRevisionCreatedRowResult {
  rowVersionId: string;
  rowCreatedId: string;
}

export interface DraftRevisionCreateRowsCommandReturnType {
  tableVersionId: string;
  previousTableVersionId: string;
  tableCreatedId: string;
  createdRows: DraftRevisionCreatedRowResult[];
}

export class DraftRevisionCreateRowsCommand {
  constructor(public readonly data: DraftRevisionCreateRowsCommandData) {}
}
