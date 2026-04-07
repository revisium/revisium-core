import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApiKeyApiService } from 'src/features/api-key/api-key-api.service';
import { ApiKeyScopeService } from 'src/features/api-key/api-key-scope.service';
import { ApiKeyTrackingService } from 'src/features/api-key/api-key-tracking.service';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { InternalKeyBootstrapService } from 'src/features/api-key/internal-key-bootstrap.service';
import { API_KEY_COMMANDS } from 'src/features/api-key/commands';
import { API_KEY_QUERIES } from 'src/features/api-key/queries';
import { DatabaseModule } from 'src/infrastructure/database/database.module';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [
    ApiKeyService,
    ApiKeyApiService,
    ApiKeyTrackingService,
    ApiKeyScopeService,
    InternalKeyBootstrapService,
    ...API_KEY_COMMANDS,
    ...API_KEY_QUERIES,
  ],
  exports: [
    ApiKeyService,
    ApiKeyApiService,
    ApiKeyTrackingService,
    ApiKeyScopeService,
  ],
})
export class ApiKeyModule {}
