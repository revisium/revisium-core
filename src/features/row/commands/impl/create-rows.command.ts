import { ApiCreateRowsCommandData } from '@revisium/engine';

export class CreateRowsCommand {
  constructor(public readonly data: ApiCreateRowsCommandData) {}
}
