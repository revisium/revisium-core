import { ObjectType } from '@nestjs/graphql';
import { UsersProjectModel } from 'src/api/graphql-api/project/model/users-project.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';

@ObjectType()
export class UsersProjectConnection extends Paginated(UsersProjectModel) {}
