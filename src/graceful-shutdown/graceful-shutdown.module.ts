import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GracefulShutdownService } from 'src/graceful-shutdown/graceful-shutdown.service';

@Module({
  imports: [ConfigModule],
  providers: [GracefulShutdownService],
})
export class GracefulShutdownModule {}
