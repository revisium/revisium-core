export class GetProjectQuery {
  constructor(
    public data: {
      readonly organizationId: string;
      readonly projectName: string;
    },
  ) {}
}
