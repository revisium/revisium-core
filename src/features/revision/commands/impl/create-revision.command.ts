import { ApiCreateRevisionCommandData } from '@revisium/engine';

export class CreateRevisionCommand {
  constructor(public readonly data: ApiCreateRevisionCommandData) {}
}
