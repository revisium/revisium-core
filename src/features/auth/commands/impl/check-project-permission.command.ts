import { IPermissionParams } from 'src/features/auth/guards/permission-params';

export class CheckProjectPermissionCommand {
  constructor(
    public readonly data: {
      readonly permissions: IPermissionParams[];
      readonly userId?: string;
    } & (
      | { readonly organizationId: string; readonly projectName: string }
      | { readonly revisionId: string }
      | { readonly endpointId: string }
      | { readonly projectId: string }
    ),
  ) {}
}

export type CheckProjectPermissionCommandData =
  CheckProjectPermissionCommand['data'];

export type CheckProjectPermissionCommandReturnType = boolean;
