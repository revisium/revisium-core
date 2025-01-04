import { EndpointType } from '@prisma/client';

export class ApiCreateEndpointCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly type: EndpointType;
    },
  ) {}
}
