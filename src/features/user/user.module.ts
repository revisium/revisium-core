import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from 'src/features/auth/auth.module';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { USER_COMMANDS } from 'src/features/user/commands';
import { USER_QUERIES } from 'src/features/user/queries';

@Module({
  imports: [CqrsModule, DatabaseModule, AuthModule],
  providers: [...USER_QUERIES, ...USER_COMMANDS],
})
export class UserModule {}
