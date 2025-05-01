export class UploadFileCommand {
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

export type UploadFileCommandData = UploadFileCommand['data'];

export type UploadFileCommandReturnType = {
  tableVersionId: string;
  previousTableVersionId: string;
  rowVersionId: string;
  previousRowVersionId: string;
};
