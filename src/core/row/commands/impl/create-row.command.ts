import { ApiCreateRowCommandData } from '@revisium/engine';

export class CreateRowCommand {
  constructor(public readonly data: ApiCreateRowCommandData) {}
}
