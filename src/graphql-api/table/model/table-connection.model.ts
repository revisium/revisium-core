import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/graphql-api/share/model/paginated.model';
import { TableModel } from 'src/graphql-api/table/model/table.model';

@ObjectType()
export class TablesConnection extends Paginated(TableModel) {}
