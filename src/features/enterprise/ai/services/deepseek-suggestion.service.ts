import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { systemPrompt } from 'src/features/enterprise/ai/services/constants';
import {
  RowSuggestion,
  SuggestionDto,
} from 'src/features/enterprise/ai/services/types';

@Injectable()
export class DeepseekSuggestionService {
  private readonly logger = new Logger(DeepseekSuggestionService.name);

  private readonly _client: OpenAI;

  private readonly model: string;
  private readonly temperature: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('DEEPSEEK_API_KEY');
    const baseURL = configService.get<string>(
      'DEEPSEEK_API_BASE_URL',
      'https://api.deepseek.com',
    );

    this.model = configService.get<string>('DEEPSEEK_MODEL', 'deepseek-chat');
    this.temperature = parseFloat(
      configService.get<string>('DEEPSEEK_TEMPERATURE', '0'),
    );

    if (apiKey) {
      this.logger.log({
        model: this.model,
        temperature: this.temperature,
        baseURL,
      });
      this._client = new OpenAI({
        baseURL,
        apiKey,
      });
    } else {
      this.logger.log('DEEPSEEK is not available');
    }
  }

  public get isAvailable(): boolean {
    return Boolean(this._client && this.model);
  }

  public async rowSuggestion(data: SuggestionDto): Promise<RowSuggestion> {
    const userContent = this.buildContent(data);

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt.trim() },
      { role: 'user', content: userContent },
    ];

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: messages,
      temperature: this.temperature,
    });

    this.logger.debug({ usage: completion.usage });

    return this.parseAndValidateResponse(
      completion.choices[0].message.content ?? '',
    );
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
      throw new Error('DEEPSEEK is not available');
    }

    return this._client;
  }
}
