import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RowSuggestion,
  SuggestionDto,
} from 'src/features/enterprise/ai/services/types';

export interface AiServiceConfig {
  apiKey?: string;
  baseURL?: string;
  model: string;
  temperature: number;
  maxTokens?: number;
}

export abstract class BaseAiSuggestionService {
  protected readonly logger: Logger;
  protected readonly config: AiServiceConfig;

  constructor(
    protected readonly configService: ConfigService,
    private readonly serviceName: string,
    private readonly envPrefix: string,
  ) {
    this.logger = new Logger(`${serviceName}SuggestionService`);
    this.config = this.loadConfig();

    if (this.config.apiKey) {
      this.logger.log({
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        baseURL: this.config.baseURL,
      });
    } else {
      this.logger.log(`${serviceName.toUpperCase()} is not available`);
    }
  }

  public abstract get isAvailable(): boolean;
  public abstract rowSuggestion(data: SuggestionDto): Promise<RowSuggestion>;

  protected parseAndValidateResponse(content: string): RowSuggestion {
    try {
      return JSON.parse(content);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  protected buildContent({
    projectName,
    tableId,
    rowId,
    schema,
    data,
    userPrompt,
  }: SuggestionDto): string {
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

  private loadConfig(): AiServiceConfig {
    return {
      apiKey: this.configService.get<string>(`${this.envPrefix}_API_KEY`),
      baseURL: this.configService.get<string>(`${this.envPrefix}_API_BASE_URL`),
      model: this.configService.get<string>(`${this.envPrefix}_MODEL`, ''),
      temperature: parseFloat(
        this.configService.get<string>(`${this.envPrefix}_TEMPERATURE`, '0'),
      ),
      maxTokens: this.configService.get<string>(`${this.envPrefix}_MAX_TOKENS`)
        ? parseInt(
            this.configService.get<string>(`${this.envPrefix}_MAX_TOKENS`) ??
              '',
          )
        : undefined,
    };
  }
}
