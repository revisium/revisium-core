import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as client from 'prom-client';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { MetricsEnabledGuard } from 'src/infrastructure/metrics-api/metrics-enabled.guard';
import { MetricsController } from 'src/infrastructure/metrics-api/metrics.controller';

@Module({
  imports: [DatabaseModule, ConfigModule],
  providers: [MetricsEnabledGuard],
  controllers: [MetricsController],
})
export class MetricsApiModule implements OnModuleInit {
  onModuleInit() {
    client.collectDefaultMetrics();
  }
}
