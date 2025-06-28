import { AnthropicSuggestionService } from 'src/features/enterprise/ai/services/anthropic-suggestion.service';
import { DeepseekSuggestionService } from 'src/features/enterprise/ai/services/deepseek-suggestion.service';
import { OpenaiSuggestionService } from 'src/features/enterprise/ai/services/openai-suggestion.service';
import { SuggestionService } from 'src/features/enterprise/ai/services/suggestion.service';

export const AI_SERVICES = [
  SuggestionService,
  OpenaiSuggestionService,
  AnthropicSuggestionService,
  DeepseekSuggestionService,
];
