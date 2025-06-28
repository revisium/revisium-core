import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { systemPrompt } from 'src/features/enterprise/ai/services/constants';
import {
  RowSuggestion,
  SuggestionDto,
} from 'src/features/enterprise/ai/services/types';

@Injectable()
export class OpenaiSuggestionService {
  private readonly logger = new Logger(OpenaiSuggestionService.name);

  private readonly _client: OpenAI;

  private readonly model: string;
  private readonly temperature: number;

  private readonly promptId: string | undefined;
  private readonly promptVersion: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('OPENAI_API_KEY');
    const baseURL = configService.get<string>(
      'OPENAI_API_BASE_URL',
      'https://api.openai.com/v1',
    );

    this.model = configService.get<string>('OPENAI_MODEL', 'gpt-4o');
    this.temperature = parseFloat(
      configService.get<string>('OPENAI_TEMPERATURE', '0'),
    );
    this.promptId = configService.get<string>('OPENAI_PROMPT_ID');
    this.promptVersion = configService.get<string>('OPENAI_PROMPT_VERSION');

    if (apiKey) {
      this._client = new OpenAI({
        baseURL,
        apiKey,
      });
    } else {
      this.logger.log('OPENAI is not available');
    }
  }

  public get isAvailable(): boolean {
    return Boolean(this._client);
  }

  public async rowSuggestion(data: SuggestionDto): Promise<RowSuggestion> {
    const userContent = this.buildContent(data);

    if (this.promptId && this.promptVersion) {
      const response = await this.client.responses.create({
        model: this.model,
        prompt: {
          id: this.promptId,
          version: this.promptVersion,
        },
        input: userContent,
        temperature: this.temperature,
      });
      return this.parseAndValidateResponse(response.output_text);
    } else {
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt.trim() },
        { role: 'user', content: userContent },
      ];

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: this.temperature,
      });

      return this.parseAndValidateResponse(
        completion.choices[0].message.content ?? '',
      );
    }
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
      throw new Error('OPENAI is not available');
    }

    return this._client;
  }
}
