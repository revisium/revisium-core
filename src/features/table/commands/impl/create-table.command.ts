import { ApiCreateTableCommandData } from '@revisium/engine';

export class CreateTableCommand {
  constructor(public readonly data: ApiCreateTableCommandData) {}
}
