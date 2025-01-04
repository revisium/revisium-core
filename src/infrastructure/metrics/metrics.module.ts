import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { GraphqlMetricsPlugin } from 'src/infrastructure/metrics/graphql/graphql-metrics.plugin';
import { GraphqlMetricsService } from 'src/infrastructure/metrics/graphql/graphql-metrics.service';
import { RestMetricsInterceptor } from 'src/infrastructure/metrics/rest/rest-metrics.interceptor';
import { RestMetricsService } from 'src/infrastructure/metrics/rest/rest-metrics.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  providers: [
    GraphqlMetricsService,
    GraphqlMetricsPlugin,
    RestMetricsService,
    RestMetricsInterceptor,
  ],
  exports: [GraphqlMetricsPlugin, RestMetricsService, RestMetricsInterceptor],
})
export class MetricsModule {}
