import { UsersProjectModel } from 'src/api/rest-api/project/model/users-project.model';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class UsersProjectConnection extends Paginated(
  UsersProjectModel,
  'UsersProjectModel',
) {}
