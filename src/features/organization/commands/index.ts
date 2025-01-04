import {
  AddUserToOrganizationHandler,
  RemoveUserFromOrganizationHandler,
} from 'src/features/organization/commands/handlers';

export const ORGANIZATIONS_COMMANDS = [
  AddUserToOrganizationHandler,
  RemoveUserFromOrganizationHandler,
];
