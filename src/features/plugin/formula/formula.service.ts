import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FormulaService {
  public readonly isAvailable: boolean;

  constructor(configService: ConfigService) {
    const value = configService.get('FORMULA_ENABLED');
    this.isAvailable = value === '1' || value === 'true';
  }
}
