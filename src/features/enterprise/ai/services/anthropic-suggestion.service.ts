import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from 'src/features/enterprise/ai/services/constants';
import {
  RowSuggestion,
  SuggestionDto,
} from 'src/features/enterprise/ai/services/types';

@Injectable()
export class AnthropicSuggestionService {
  private readonly logger = new Logger(AnthropicSuggestionService.name);

  private readonly _client: Anthropic;

  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('ANTHROPIC_API_KEY');
    const baseURL = configService.get<string>(
      'ANTHROPIC_API_BASE_URL',
      'https://api.anthropic.com',
    );

    this.model = configService.get<string>(
      'ANTHROPIC_MODEL',
      'claude-3-5-sonnet-20241022',
    );
    this.temperature = parseFloat(
      configService.get<string>('ANTHROPIC_TEMPERATURE', '0'),
    );
    this.maxTokens = parseInt(
      configService.get<string>('ANTHROPIC_MAX_TOKENS', '4096'),
    );

    if (apiKey) {
      this.logger.log({
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
      });
      this._client = new Anthropic({
        baseURL,
        apiKey,
      });
    } else {
      this.logger.log('ANTHROPIC is not available');
    }
  }

  public get isAvailable(): boolean {
    return Boolean(this._client && this.model);
  }

  public async rowSuggestion(data: SuggestionDto): Promise<RowSuggestion> {
    const userContent = this.buildContent(data);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      system: systemPrompt.trim(),
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    const content = response.content[0];

    this.logger.debug({ usage: response.usage });

    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return this.parseAndValidateResponse(content.text);
  }

  private parseAndValidateResponse(content: string) {
    try {
      return JSON.parse(content);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  private buildContent({
    projectName,
    tableId,
    rowId,
    schema,
    data,
    userPrompt,
  }: SuggestionDto) {
    const contextInfo = `Project ID: ${projectName}\nTable ID: ${tableId}\nRow ID: ${rowId}`;

    return [
      contextInfo,
      'JSON SCHEMA:',
      JSON.stringify(schema, null, 2),
      'DATA:',
      JSON.stringify(data, null, 2),
      'USER REQUEST:',
      userPrompt.trim(),
      '',
      'Reply strictly with JSON as described.',
    ].join('\n\n');
  }

  private get client() {
    if (!this._client) {
      throw new Error('ANTHROPIC is not available');
    }

    return this._client;
  }
}
