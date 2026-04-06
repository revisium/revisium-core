import { ApiRemoveRowsCommandData } from '@revisium/engine';

export class RemoveRowsCommand {
  constructor(public readonly data: ApiRemoveRowsCommandData) {}
}
