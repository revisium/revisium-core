import { EndpointType } from '@prisma/client';

export class CreateEndpointCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly type: EndpointType;
    },
  ) {}
}
