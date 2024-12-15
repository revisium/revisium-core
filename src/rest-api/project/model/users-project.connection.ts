import { UsersProjectModel } from 'src/rest-api/project/model/users-project.model';
import { Paginated } from 'src/rest-api/share/model/paginated.model';

export class UsersProjectConnection extends Paginated(
  UsersProjectModel,
  'UsersProjectModel',
) {}
