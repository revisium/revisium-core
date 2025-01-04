import { ObjectType } from '@nestjs/graphql';
import { RowReferenceModel } from 'src/api/graphql-api/row/model/row-reference.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';

@ObjectType()
export class RowReferencesConnectionModel extends Paginated(
  RowReferenceModel,
) {}
