import { Injectable, OnModuleInit } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { OrganizationApiService } from 'src/features/organization/organization-api.service';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { TableApiService } from 'src/features/table/table-api.service';
import { RowApiService } from 'src/features/row/row-api.service';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { RevisionChangesApiService } from 'src/features/revision-changes/revision-changes-api.service';
import { UserApiService } from 'src/features/user/user-api.service';
import { McpSession, McpSessionService } from './mcp-session.service';
import { McpContext } from './types';

import { SchemaResource, QueryResource, MigrationResource } from './resources';

import {
  AuthTools,
  OrganizationTools,
  ProjectTools,
  BranchTools,
  TableTools,
  RowTools,
  RevisionTools,
  RevisionChangesTools,
  MigrationTools,
  UserTools,
} from './tools';

@Injectable()
export class McpServerService implements OnModuleInit {
  private readonly server: McpServer;

  private schemaResource: SchemaResource;
  private queryResource: QueryResource;
  private migrationResource: MigrationResource;

  private authTools: AuthTools;
  private organizationTools: OrganizationTools;
  private projectTools: ProjectTools;
  private branchTools: BranchTools;
  private tableTools: TableTools;
  private rowTools: RowTools;
  private revisionTools: RevisionTools;
  private revisionChangesTools: RevisionChangesTools;
  private migrationTools: MigrationTools;
  private userTools: UserTools;

  constructor(
    private readonly mcpSession: McpSessionService,
    private readonly authApi: AuthApiService,
    private readonly organizationApi: OrganizationApiService,
    private readonly projectApi: ProjectApiService,
    private readonly branchApi: BranchApiService,
    private readonly draftApi: DraftApiService,
    private readonly tableApi: TableApiService,
    private readonly rowApi: RowApiService,
    private readonly revisionsApi: RevisionsApiService,
    private readonly revisionChangesApi: RevisionChangesApiService,
    private readonly userApi: UserApiService,
  ) {
    this.server = new McpServer({
      name: 'revisium',
      version: '1.0.0',
    });

    this.schemaResource = new SchemaResource();
    this.queryResource = new QueryResource();
    this.migrationResource = new MigrationResource();

    this.authTools = new AuthTools(this.mcpSession, this.authApi);
    this.organizationTools = new OrganizationTools(this.organizationApi);
    this.projectTools = new ProjectTools(this.projectApi, this.branchApi);
    this.branchTools = new BranchTools(this.branchApi);
    this.tableTools = new TableTools(this.tableApi, this.draftApi);
    this.rowTools = new RowTools(this.rowApi, this.draftApi);
    this.revisionTools = new RevisionTools(this.revisionsApi, this.draftApi);
    this.revisionChangesTools = new RevisionChangesTools(
      this.revisionChangesApi,
    );
    this.migrationTools = new MigrationTools(this.revisionsApi, this.draftApi);
    this.userTools = new UserTools(this.userApi);
  }

  onModuleInit() {
    this.schemaResource.register(this.server);
    this.queryResource.register(this.server);
    this.migrationResource.register(this.server);

    const requireAuth = this.requireAuth.bind(this);
    this.authTools.register(this.server, requireAuth);
    this.organizationTools.register(this.server, requireAuth);
    this.projectTools.register(this.server, requireAuth);
    this.branchTools.register(this.server, requireAuth);
    this.tableTools.register(this.server, requireAuth);
    this.rowTools.register(this.server, requireAuth);
    this.revisionTools.register(this.server, requireAuth);
    this.revisionChangesTools.register(this.server, requireAuth);
    this.migrationTools.register(this.server, requireAuth);
    this.userTools.register(this.server, requireAuth);
  }

  public getServer(): McpServer {
    return this.server;
  }

  private getSessionFromContext(context: McpContext): McpSession | null {
    if (!context?.sessionId) return null;
    return this.mcpSession.getSession(context.sessionId);
  }

  private requireAuth(context: McpContext): McpSession {
    const session = this.getSessionFromContext(context);
    if (!session) {
      throw new Error('Not authenticated. Please use the login tool first.');
    }
    return session;
  }
}
