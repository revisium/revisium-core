import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FormulaService {
  private readonly enabled: boolean;

  constructor(configService: ConfigService) {
    this.enabled =
      configService.get('FORMULA_ENABLED')?.toLowerCase() === 'true';
  }

  public get isAvailable(): boolean {
    return this.enabled;
  }
}
