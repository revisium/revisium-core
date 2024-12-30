import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';
import { MetricsEnabledGuard } from 'src/metrics/metrics-enabled.guard';
import { GraphqlMetricsPlugin } from 'src/metrics/graphql/graphql-metrics.plugin';
import { GraphqlMetricsService } from 'src/metrics/graphql/graphql-metrics.service';
import { MetricsController } from 'src/metrics/metrics.controller';

import * as client from 'prom-client';
import { RestMetricsInterceptor } from 'src/metrics/rest/rest-metrics.interceptor';
import { RestMetricsService } from 'src/metrics/rest/rest-metrics.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  providers: [
    MetricsEnabledGuard,
    GraphqlMetricsService,
    GraphqlMetricsPlugin,
    RestMetricsService,
    RestMetricsInterceptor,
  ],
  controllers: [MetricsController],
  exports: [GraphqlMetricsPlugin, RestMetricsService, RestMetricsInterceptor],
})
export class MetricsModule implements OnModuleInit {
  onModuleInit() {
    client.collectDefaultMetrics();
  }
}
