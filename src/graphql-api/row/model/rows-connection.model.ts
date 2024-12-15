import { ObjectType } from '@nestjs/graphql';
import { RowModel } from 'src/graphql-api/row/model/row.model';
import { Paginated } from 'src/graphql-api/share/model/paginated.model';

@ObjectType()
export class RowsConnection extends Paginated(RowModel) {}
