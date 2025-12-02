import { Module } from '@nestjs/common';
import { AuthModule } from 'src/features/auth/auth.module';
import { BranchModule } from 'src/features/branch/branch.module';
import { DraftModule } from 'src/features/draft/draft.module';
import { OrganizationModule } from 'src/features/organization/organization.module';
import { ProjectModule } from 'src/features/project/project.module';
import { RevisionModule } from 'src/features/revision/revision.module';
import { RevisionChangesModule } from 'src/features/revision-changes/revision-changes.module';
import { RowModule } from 'src/features/row/row.module';
import { ShareModule } from 'src/features/share/share.module';
import { TableModule } from 'src/features/table/table.module';
import { UserModule } from 'src/features/user/user.module';
import { McpController } from './mcp.controller';
import { McpServerService } from './mcp-server.service';
import { McpSessionService } from './mcp-session.service';

@Module({
  imports: [
    AuthModule,
    OrganizationModule,
    ProjectModule,
    BranchModule,
    DraftModule,
    TableModule,
    RowModule,
    RevisionModule,
    RevisionChangesModule,
    UserModule,
    ShareModule,
  ],
  controllers: [McpController],
  providers: [McpServerService, McpSessionService],
})
export class McpModule {}
