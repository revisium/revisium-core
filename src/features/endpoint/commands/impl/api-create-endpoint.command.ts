import { Endpoint, EndpointType } from 'src/__generated__/client';

export class ApiCreateEndpointCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly type: EndpointType;
    },
  ) {}
}

export type ApiCreateEndpointCommandData = ApiCreateEndpointCommand['data'];

export type ApiCreateEndpointCommandReturnType = Endpoint;
