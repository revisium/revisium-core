import { ApiRemoveRowCommandData } from '@revisium/engine';

export class RemoveRowCommand {
  constructor(public readonly data: ApiRemoveRowCommandData) {}
}
