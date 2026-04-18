import { AddUserToOrganizationHandler } from 'src/features/organization/commands/handlers/add-user-to-organization.handler';
import { RemoveUserFromOrganizationHandler } from 'src/features/organization/commands/handlers/remove-user-from-organization.handler';

export const ORGANIZATIONS_COMMANDS = [
  AddUserToOrganizationHandler,
  RemoveUserFromOrganizationHandler,
];
