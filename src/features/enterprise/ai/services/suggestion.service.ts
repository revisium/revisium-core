import { Injectable, Logger } from '@nestjs/common';
import { AnthropicSuggestionService } from 'src/features/enterprise/ai/services/anthropic-suggestion.service';
import { OpenaiSuggestionService } from 'src/features/enterprise/ai/services/openai-suggestion.service';
import {
  RowSuggestion,
  SuggestionDto,
} from 'src/features/enterprise/ai/services/types';

@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(
    private readonly openaiSuggestionService: OpenaiSuggestionService,
    private readonly anthropicSuggestionService: AnthropicSuggestionService,
  ) {}

  public rowSuggestion(data: SuggestionDto): Promise<RowSuggestion> {
    if (this.anthropicSuggestionService.isAvailable) {
      this.logger.debug({ type: 'anthropic', data });
      return this.anthropicSuggestionService.rowSuggestion(data);
    }

    if (this.openaiSuggestionService.isAvailable) {
      this.logger.debug({ type: 'openai', data });
      return this.openaiSuggestionService.rowSuggestion(data);
    }

    throw new Error('No AI suggestion service is available');
  }
}
