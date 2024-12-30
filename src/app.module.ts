import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from 'src/core/core.module';
import { MetricsApiModule } from 'src/metrics-api/metrics-api.module';

@Module({
  imports: [ConfigModule.forRoot(), CoreModule, MetricsApiModule],
})
export class AppModule {}
