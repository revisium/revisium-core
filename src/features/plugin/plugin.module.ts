import { Module } from '@nestjs/common';
import { FilePlugin } from 'src/features/plugin/file.plugin';
import { DatabaseModule } from 'src/infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [FilePlugin],
})
export class PluginModule {}
