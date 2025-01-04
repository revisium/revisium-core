import { UsersOrganizationModel } from 'src/api/rest-api/organization/model/users-organization.model';
import { Paginated } from 'src/api/rest-api/share/model/paginated.model';

export class UsersOrganizationConnection extends Paginated(
  UsersOrganizationModel,
  'UsersOrganizationModel',
) {}
