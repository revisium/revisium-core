import { ObjectType } from '@nestjs/graphql';
import { UsersOrganizationModel } from 'src/api/graphql-api/organization/model/users-organization.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';

@ObjectType()
export class UsersOrganizationConnection extends Paginated(
  UsersOrganizationModel,
) {}
