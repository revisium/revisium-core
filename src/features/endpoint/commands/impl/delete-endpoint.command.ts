export class DeleteEndpointCommand {
  constructor(public readonly data: { readonly endpointId: string }) {}
}

export type DeleteEndpointCommandData = DeleteEndpointCommand['data'];
