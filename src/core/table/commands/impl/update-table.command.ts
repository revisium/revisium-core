import { ApiUpdateTableCommandData } from '@revisium/engine';

export class UpdateTableCommand {
  constructor(public readonly data: ApiUpdateTableCommandData) {}
}
