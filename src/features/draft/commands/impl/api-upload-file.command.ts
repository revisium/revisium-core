import { GetRowByIdQueryReturnType } from 'src/features/row/queries/impl';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export class ApiUploadFileCommand {
  constructor(
    public readonly data: {
      revisionId: string;
      tableId: string;
      rowId: string;
      fileId: string;
      file: Express.Multer.File;
    },
  ) {}
}

export type ApiUploadFileCommandData = ApiUploadFileCommand['data'];

export type ApiUploadFileCommandReturnType = {
  table: GetTableByIdReturnType;
  previousVersionTableId: string;
  row: GetRowByIdQueryReturnType;
  previousVersionRowId: string;
};
