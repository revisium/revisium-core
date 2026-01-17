import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FormulaService implements OnModuleInit {
  private readonly logger = new Logger(FormulaService.name);
  private readonly enabled: boolean;

  constructor(configService: ConfigService) {
    this.enabled =
      configService.get('FORMULA_ENABLED')?.toLowerCase() === 'true';
  }

  onModuleInit() {
    if (this.enabled) {
      this.logger.log('✅ Formula feature enabled');
    } else {
      this.logger.warn(
        'Formula feature disabled. Set FORMULA_ENABLED=true to enable.',
      );
    }
  }

  public get isAvailable(): boolean {
    return this.enabled;
  }
}
