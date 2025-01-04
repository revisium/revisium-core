import { ApiCreateProjectHandler } from 'src/features/project/commands/handlers/api-create-project.handler';
import { CreateProjectHandler } from 'src/features/project/commands/handlers/create-project.handler';
import { DeleteProjectHandler } from 'src/features/project/commands/handlers/delete-project.handler';
import { AddUserToProjectHandler } from 'src/features/project/commands/handlers/add-user-to-project.handler';
import { RemoveUserFromProjectHandler } from 'src/features/project/commands/handlers/remove-user-from-project.handler';
import { UpdateProjectHandler } from 'src/features/project/commands/handlers/update-project.handler';

export const PROJECT_HANDLERS = [
  CreateProjectHandler,
  ApiCreateProjectHandler,
  DeleteProjectHandler,
  AddUserToProjectHandler,
  RemoveUserFromProjectHandler,
  UpdateProjectHandler,
];
