import { IPermissionParams } from 'src/auth/guards/permission-params';

export class CheckProjectPermissionCommand {
  constructor(
    public readonly data: {
      readonly permissions: IPermissionParams[];
      readonly userId?: string;
    } & (
      | { readonly organizationId: string; readonly projectName: string }
      | { readonly revisionId: string }
      | {
          readonly endpointId: string;
        }
    ),
  ) {}
}
