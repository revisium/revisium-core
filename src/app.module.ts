import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from 'src/common/interceptors/logging.interceptor';
import { CoreModule } from 'src/core/core.module';
import { MetricsApiModule } from 'src/metrics-api/metrics-api.module';

@Module({
  imports: [ConfigModule.forRoot(), CoreModule, MetricsApiModule],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})
export class AppModule {}
