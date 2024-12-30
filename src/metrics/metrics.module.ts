import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';
import { GraphqlMetricsPlugin } from 'src/metrics/graphql/graphql-metrics.plugin';
import { GraphqlMetricsService } from 'src/metrics/graphql/graphql-metrics.service';
import { RestMetricsInterceptor } from 'src/metrics/rest/rest-metrics.interceptor';
import { RestMetricsService } from 'src/metrics/rest/rest-metrics.service';

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
