import { GetRoleHandler } from 'src/features/role/queries/handlers/get-role.handler';
import { GetRolePermissionsHandler } from 'src/features/role/queries/handlers/get-role-permissions.handler';

export const ROLE_QUERIES = [GetRoleHandler, GetRolePermissionsHandler];
