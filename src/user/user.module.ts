import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { USER_COMMANDS } from 'src/user/commands';
import { USER_QUERIES } from './queries';

@Module({
  imports: [CqrsModule, DatabaseModule, AuthModule],
  providers: [...USER_QUERIES, ...USER_COMMANDS],
})
export class UserModule {}
