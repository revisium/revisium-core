import { ApiRenameTableCommandData } from '@revisium/engine';

export class RenameTableCommand {
  constructor(public readonly data: ApiRenameTableCommandData) {}
}
