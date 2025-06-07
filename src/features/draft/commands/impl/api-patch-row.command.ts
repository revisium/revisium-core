import { Prisma } from '@prisma/client';
import { GetRowByIdReturnType } from 'src/features/row/queries/types';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export class ApiPatchRowCommand {
  constructor(
    public readonly data: {
      patches: { path: string; value: Prisma.InputJsonValue }[];
      revisionId: string;
      tableId: string;
      rowId: string;
      skipCheckingNotSystemTable?: boolean;
    },
  ) {}
}

export type ApiPatchRowCommandData = ApiPatchRowCommand['data'];

export type ApiPatchRowCommandReturnType = {
  table: GetTableByIdReturnType;
  previousVersionTableId: string;
  row: GetRowByIdReturnType;
  previousVersionRowId: string;
};
