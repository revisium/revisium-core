import { ApiPatchRowsCommandData } from '@revisium/engine';

export class PatchRowsCommand {
  constructor(public readonly data: ApiPatchRowsCommandData) {}
}
