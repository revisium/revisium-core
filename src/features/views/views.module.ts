import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ShareModule } from 'src/features/share/share.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { ViewValidationService } from 'src/features/views/services';

@Module({
  imports: [DatabaseModule, CqrsModule, ShareModule],
  providers: [ViewValidationService],
  exports: [ViewValidationService],
})
export class ViewsModule {}
