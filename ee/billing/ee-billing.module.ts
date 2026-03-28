import { DynamicModule, Module } from '@nestjs/common';
import { LIMITS_SERVICE_TOKEN } from 'src/features/billing/limits.interface';
import { LimitsService } from './limits/limits.service';

@Module({})
export class EeBillingModule {
  static register(): DynamicModule {
    return {
      module: EeBillingModule,
      providers: [
        {
          provide: LIMITS_SERVICE_TOKEN,
          useClass: LimitsService,
        },
      ],
      exports: [LIMITS_SERVICE_TOKEN],
    };
  }
}
