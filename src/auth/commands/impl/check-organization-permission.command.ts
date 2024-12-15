import { IPermissionParams } from 'src/auth/guards/permission-params';

export class CheckOrganizationPermissionCommand {
  constructor(
    public readonly data: {
      readonly permissions: IPermissionParams[];
      readonly organizationId: string;
      readonly userId?: string;
    },
  ) {}
}
