import { DynamicModule, Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { EngineModule, IStorageService } from '@revisium/engine';
import { S3StorageService } from 'src/infrastructure/storage/s3-storage.service';
import { LocalStorageService } from 'src/infrastructure/storage/local-storage.service';
import { NullStorageService } from 'src/infrastructure/storage/null-storage.service';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { CoreEngineApiService } from 'src/core/core-engine-api.service';

export interface CoreEngineModuleOptions {
  storage?: IStorageService;
}

function createStorageFromEnv(): IStorageService {
  const configService = new ConfigService();
  const provider = configService.get<string>('STORAGE_PROVIDER');

  switch (provider) {
    case 's3':
      return new S3StorageService(configService);
    case 'local':
      return new LocalStorageService(configService);
    default: {
      const s3Service = new S3StorageService(configService);
      if (s3Service.isAvailable) {
        return s3Service;
      }
      return new NullStorageService();
    }
  }
}

@Global()
@Module({})
export class CoreEngineModule {
  static forRoot(options?: CoreEngineModuleOptions): DynamicModule {
    const storage = options?.storage ?? createStorageFromEnv();

    return {
      module: CoreEngineModule,
      imports: [
        EngineModule.forRoot({ storage }),
        CqrsModule,
        DatabaseModule,
        RevisiumCacheModule.forRootAsync(),
        NotificationModule,
      ],
      providers: [CoreEngineApiService],
      exports: [EngineModule, CoreEngineApiService],
    };
  }
}
