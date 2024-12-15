import { ApiCreateProjectHandler } from 'src/project/commands/handlers/api-create-project.handler';
import { CreateProjectHandler } from 'src/project/commands/handlers/create-project.handler';
import { DeleteProjectHandler } from 'src/project/commands/handlers/delete-project.handler';
import { AddUserToProjectHandler } from 'src/project/commands/handlers/add-user-to-project.handler';
import { RemoveUserFromProjectHandler } from 'src/project/commands/handlers/remove-user-from-project.handler';
import { UpdateProjectHandler } from 'src/project/commands/handlers/update-project.handler';

export const PROJECT_HANDLERS = [
  CreateProjectHandler,
  ApiCreateProjectHandler,
  DeleteProjectHandler,
  AddUserToProjectHandler,
  RemoveUserFromProjectHandler,
  UpdateProjectHandler,
];
