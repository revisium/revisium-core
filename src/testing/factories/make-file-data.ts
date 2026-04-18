/**
 * Schema-default payload for `$ref: File` row creation.
 *
 * The engine's FilePlugin rejects rows whose file field is anything other
 * than schema defaults (it then populates `status=ready` + `fileId=<nanoid>`
 * in the `afterCreateRow` hook). Tests that need a file row should pass
 * this as-is to `engine.createRow({ data: { file: makeEmptyFileData() } })`
 * and then read the resolved values back from the row.
 */
export interface EmptyFileData {
  status: string;
  fileId: string;
  url: string;
  fileName: string;
  hash: string;
  extension: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

export function makeEmptyFileData(): EmptyFileData {
  return {
    status: '',
    fileId: '',
    url: '',
    fileName: '',
    hash: '',
    extension: '',
    mimeType: '',
    size: 0,
    width: 0,
    height: 0,
  };
}
