import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { LicenseGuard } from './license.guard';
import { LicenseService } from './license.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [LicenseService, LicenseGuard],
  exports: [LicenseService, LicenseGuard],
})
export class EeLicensingModule {}
