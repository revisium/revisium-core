import { UsersOrganizationModel } from 'src/rest-api/organization/model/users-organization.model';
import { Paginated } from 'src/rest-api/share/model/paginated.model';

export class UsersOrganizationConnection extends Paginated(
  UsersOrganizationModel,
  'UsersOrganizationModel',
) {}
