import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';
import { TableModel } from 'src/api/graphql-api/table/model/table.model';

@ObjectType()
export class TablesConnection extends Paginated(TableModel) {}
