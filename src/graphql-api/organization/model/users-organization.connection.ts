import { ObjectType } from '@nestjs/graphql';
import { UsersOrganizationModel } from 'src/graphql-api/organization/model/users-organization.model';
import { Paginated } from 'src/graphql-api/share/model/paginated.model';

@ObjectType()
export class UsersOrganizationConnection extends Paginated(
  UsersOrganizationModel,
) {}
