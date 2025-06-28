import { Injectable } from '@nestjs/common';
import { OpenaiSuggestionService } from 'src/features/enterprise/ai/services/openai-suggestion.service';
import {
  RowSuggestion,
  SuggestionDto,
} from 'src/features/enterprise/ai/services/types';

@Injectable()
export class SuggestionService {
  constructor(
    private readonly openaiSuggestionService: OpenaiSuggestionService,
  ) {}

  public rowSuggestion(data: SuggestionDto): Promise<RowSuggestion> {
    return this.openaiSuggestionService.rowSuggestion(data);
  }
}
