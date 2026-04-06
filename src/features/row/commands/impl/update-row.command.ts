import { ApiUpdateRowCommandData } from '@revisium/engine';

export class UpdateRowCommand {
  constructor(public readonly data: ApiUpdateRowCommandData) {}
}
