import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  GetRowSuggestionQuery,
  GetRowSuggestionQueryData,
  GetRowSuggestionQueryReturnType,
} from 'src/features/enterprise/ai/queries/impl';

@Injectable()
export class AiApiService {
  constructor(private readonly queryBus: QueryBus) {}

  public getRowSuggestion(data: GetRowSuggestionQueryData) {
    return this.queryBus.execute<
      GetRowSuggestionQuery,
      GetRowSuggestionQueryReturnType
    >(new GetRowSuggestionQuery(data));
  }
}
