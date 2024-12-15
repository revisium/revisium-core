import {
  GetProjectsByUserIdHandler,
  GetUserHandler,
  GetUserOrganizationHandler,
} from 'src/user/queries/handlers';

export const USER_QUERIES = [
  GetUserHandler,
  GetUserOrganizationHandler,
  GetProjectsByUserIdHandler,
];
