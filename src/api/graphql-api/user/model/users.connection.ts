import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';
import { UserModel } from 'src/api/graphql-api/user/model/user.model';

@ObjectType()
export class UsersConnection extends Paginated(UserModel) {}
