import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { AiApiService } from 'src/features/enterprise/ai/ai.service';
import { AI_QUERIES_HANDLERS } from 'src/features/enterprise/ai/queries/handlers';
import { AI_SERVICES } from 'src/features/enterprise/ai/services';
import { ShareModule } from 'src/features/share/share.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule, ShareModule, CqrsModule],
  providers: [AiApiService, ...AI_SERVICES, ...AI_QUERIES_HANDLERS],
  exports: [AiApiService],
})
export class AiModule {}
