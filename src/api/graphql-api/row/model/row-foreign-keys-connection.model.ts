import { ObjectType } from '@nestjs/graphql';
import { RowForeignKeyModel } from 'src/api/graphql-api/row/model/row-foreign-key.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';

@ObjectType()
export class RowForeignKeysConnectionModel extends Paginated(
  RowForeignKeyModel,
) {}
