import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';
import { SearchUserModel } from 'src/api/graphql-api/user/model/search-user.model';

@ObjectType()
export class SearchUsersConnection extends Paginated(SearchUserModel) {}
