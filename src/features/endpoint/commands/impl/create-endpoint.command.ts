import { EndpointType } from 'src/__generated__/client';

export class CreateEndpointCommand {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly type: EndpointType;
    },
  ) {}
}

export type CreateEndpointCommandData = CreateEndpointCommand['data'];

export type CreateEndpointCommandReturnType = string;
