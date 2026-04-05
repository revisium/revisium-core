import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DraftModule } from 'src/features/draft/draft.module';
import { ShareModule } from 'src/features/share/share.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ViewValidationService } from 'src/features/views/services';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule, DraftModule],
  providers: [ViewValidationService],
  exports: [ViewValidationService],
})
export class ViewsModule {}
