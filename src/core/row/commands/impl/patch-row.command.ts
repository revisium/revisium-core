import { ApiPatchRowCommandData } from '@revisium/engine';

export class PatchRowCommand {
  constructor(public readonly data: ApiPatchRowCommandData) {}
}
