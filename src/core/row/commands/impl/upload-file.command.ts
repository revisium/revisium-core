import { ApiUploadFileCommandData } from '@revisium/engine';

export class UploadFileCommand {
  constructor(public readonly data: ApiUploadFileCommandData) {}
}
