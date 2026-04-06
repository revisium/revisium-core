import { ApiRemoveTableCommandData } from '@revisium/engine';

export class RemoveTableCommand {
  constructor(public readonly data: ApiRemoveTableCommandData) {}
}
