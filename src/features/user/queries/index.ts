import {
  GetProjectsByUserIdHandler,
  GetUserHandler,
  GetUserOrganizationHandler,
  SearchUsersHandler,
} from 'src/features/user/queries/handlers';

export const USER_QUERIES = [
  GetUserHandler,
  GetUserOrganizationHandler,
  GetProjectsByUserIdHandler,
  SearchUsersHandler,
];
