import { IPermissionParams } from 'src/features/auth/guards/permission-params';

export class CheckSystemPermissionCommand {
  constructor(
    public readonly data: {
      readonly permissions: IPermissionParams[];
      readonly userId?: string;
    },
  ) {}
}

export type CheckSystemPermissionCommandData =
  CheckSystemPermissionCommand['data'];

export type CheckSystemPermissionCommandReturnType = boolean;
