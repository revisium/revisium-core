export class DeleteEndpointCommand {
  constructor(public readonly data: { readonly endpointId: string }) {}
}
