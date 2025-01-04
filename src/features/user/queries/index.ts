import {
  GetProjectsByUserIdHandler,
  GetUserHandler,
  GetUserOrganizationHandler,
} from 'src/features/user/queries/handlers';

export const USER_QUERIES = [
  GetUserHandler,
  GetUserOrganizationHandler,
  GetProjectsByUserIdHandler,
];
