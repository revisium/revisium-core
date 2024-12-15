export class GetProjectByIdQuery {
  constructor(
    public data: {
      readonly projectId: string;
    },
  ) {}
}
