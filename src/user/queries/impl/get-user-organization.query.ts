export class GetUserOrganizationQuery {
  constructor(public readonly data: { readonly userId: string }) {}
}

export type GetUserOrganizationQueryReturnType = string | undefined;
