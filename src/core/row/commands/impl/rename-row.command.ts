import { ApiRenameRowCommandData } from '@revisium/engine';

export class RenameRowCommand {
  constructor(public readonly data: ApiRenameRowCommandData) {}
}
