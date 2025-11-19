import { ObjectType } from '@nestjs/graphql';
import { SearchResult } from 'src/api/graphql-api/row/model/search-result.model';
import { Paginated } from 'src/api/graphql-api/share/model/paginated.model';

@ObjectType()
export class SearchResultsConnection extends Paginated(SearchResult) {}
