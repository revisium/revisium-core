import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionSubject } from 'src/auth/consts';

export type IPermissionParams = {
  action: PermissionAction;
  subject: PermissionSubject;
};

export const PERMISSION_PARAMS_KEY = 'PERMISSION_PARAMS_KEY';

export const PermissionParams = (params: IPermissionParams) =>
  SetMetadata(PERMISSION_PARAMS_KEY, params);
