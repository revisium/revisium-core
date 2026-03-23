import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageService } from 'src/infrastructure/storage/local-storage.service';
import { NullStorageService } from 'src/infrastructure/storage/null-storage.service';
import { S3StorageService } from 'src/infrastructure/storage/s3-storage.service';
import { StorageController } from 'src/infrastructure/storage/storage.controller';
import { STORAGE_SERVICE } from 'src/infrastructure/storage/storage.interface';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('STORAGE_PROVIDER');

        switch (provider) {
          case 's3':
            return new S3StorageService(configService);
          case 'local':
            return new LocalStorageService(configService);
          default: {
            // Backwards compatibility: auto-detect S3 from env vars
            const s3Service = new S3StorageService(configService);
            if (s3Service.isAvailable) {
              return s3Service;
            }
            return new NullStorageService();
          }
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
