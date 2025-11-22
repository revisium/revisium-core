import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from 'src/features/auth/auth.module';
import { UserApiService } from 'src/features/user/user-api.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { USER_COMMANDS } from 'src/features/user/commands';
import { USER_QUERIES } from 'src/features/user/queries';

@Module({
  imports: [CqrsModule, DatabaseModule, AuthModule],
  providers: [UserApiService, ...USER_QUERIES, ...USER_COMMANDS],
  exports: [UserApiService],
})
export class UserModule {}
