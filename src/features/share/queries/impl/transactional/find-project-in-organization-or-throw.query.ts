export class FindProjectInOrganizationOrThrowQuery {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly projectName: string;
    },
  ) {}
}
