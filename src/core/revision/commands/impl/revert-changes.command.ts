import { ApiRevertChangesCommandData } from '@revisium/engine';

export class RevertChangesCommand {
  constructor(public readonly data: ApiRevertChangesCommandData) {}
}
