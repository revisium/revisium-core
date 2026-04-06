import { ApiUpdateRowsCommandData } from '@revisium/engine';

export class UpdateRowsCommand {
  constructor(public readonly data: ApiUpdateRowsCommandData) {}
}
