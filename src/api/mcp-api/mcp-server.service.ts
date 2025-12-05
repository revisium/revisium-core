import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { EndpointApiService } from 'src/features/endpoint/queries/endpoint-api.service';
import { McpSession, McpSessionService } from './mcp-session.service';
import { McpAuthHelpers, McpContext, McpPermissionCheck } from './types';

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
  EndpointTools,
} from './tools';

@Injectable()
export class McpServerService implements OnModuleInit {
  private readonly server: McpServer;

  private readonly schemaResource: SchemaResource;
  private readonly queryResource: QueryResource;
  private readonly migrationResource: MigrationResource;

  private readonly authTools: AuthTools;
  private readonly organizationTools: OrganizationTools;
  private readonly projectTools: ProjectTools;
  private readonly branchTools: BranchTools;
  private readonly tableTools: TableTools;
  private readonly rowTools: RowTools;
  private readonly revisionTools: RevisionTools;
  private readonly revisionChangesTools: RevisionChangesTools;
  private readonly migrationTools: MigrationTools;
  private readonly userTools: UserTools;
  private readonly endpointTools: EndpointTools;

  constructor(
    private readonly configService: ConfigService,
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
    private readonly endpointApi: EndpointApiService,
  ) {
    const publicUrl = this.configService.get<string>('PUBLIC_URL');
    const tokenUrl = publicUrl ? `${publicUrl}/get-mcp-token` : null;

    const instructions = `Revisium is a headless CMS with Git-like version control.

AUTHENTICATION:
When not authenticated, ASK THE USER which method they prefer:
1. [Recommended] Token auth: User opens ${tokenUrl || '<PUBLIC_URL>/get-mcp-token'} to get token, then use loginWithToken(token)
2. Credentials: Ask user for username/password, then use login(username, password)
DO NOT assume or guess credentials.

DATA STRUCTURE:
- Organization: contains projects (organizationId is usually the owner's username)
- Project: has a default branch (usually "main"), contains tables and rows
- Branch: has headRevisionId (committed state) and draftRevisionId (working state)
- Revision: immutable snapshot; use draftRevisionId for all changes
- Table: has schema (JSON Schema) and rows
- Row: data record with rowId

TYPICAL WORKFLOW:
1. me() - check auth status
2. getProject(organizationId, projectName) - returns project with rootBranch info
3. getBranch(organizationId, projectName, branchName) - get branch details including draftRevisionId
4. Use draftRevisionId for: getTables, getRows, createRow, updateRow, etc.
5. getRevisionChanges(draftRevisionId) - review pending changes before commit
6. commitRevision() - only after user approval

IMPORTANT:
- Project.rootBranch contains the default branch info
- Always use branch.draftRevisionId for modifications
- branch.headRevisionId is the last committed state (read-only)

GRAPHQL ENDPOINTS:
When working with GraphQL endpoints, use dot notation for path in where filters:
- "name" - top-level field
- "stats.strength" - nested object field
- "inventory[0].itemId" - array element by index
- "inventory[*].price" - all array elements (wildcard)
Example: { where: { data: { path: "stats.strength", gte: 10 } } }

PERMISSIONS:
- Read operations (get*) have readOnlyHint=true - safe to auto-approve
- Create/update operations need confirmation with change summary
- Delete/remove/revert are destructive - need explicit user approval`;

    this.server = new McpServer(
      {
        name: 'revisium',
        version: '1.0.0',
      },
      {
        instructions,
      },
    );

    this.schemaResource = new SchemaResource();
    this.queryResource = new QueryResource();
    this.migrationResource = new MigrationResource();

    this.authTools = new AuthTools(
      this.mcpSession,
      this.authApi,
      this.configService.get<string>('PUBLIC_URL'),
    );
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
    this.endpointTools = new EndpointTools(
      this.endpointApi,
      this.configService.get<string>('ENDPOINT_SERVICE_URL'),
    );
  }

  onModuleInit() {
    this.schemaResource.register(this.server);
    this.queryResource.register(this.server);
    this.migrationResource.register(this.server);

    const auth: McpAuthHelpers = {
      requireAuth: this.requireAuth.bind(this),
      checkPermissionByRevision: this.checkPermissionByRevision.bind(this),
      checkPermissionByOrganizationProject:
        this.checkPermissionByOrganizationProject.bind(this),
      checkPermissionByOrganization:
        this.checkPermissionByOrganization.bind(this),
    };

    this.authTools.register(this.server, auth);
    this.organizationTools.register(this.server, auth);
    this.projectTools.register(this.server, auth);
    this.branchTools.register(this.server, auth);
    this.tableTools.register(this.server, auth);
    this.rowTools.register(this.server, auth);
    this.revisionTools.register(this.server, auth);
    this.revisionChangesTools.register(this.server, auth);
    this.migrationTools.register(this.server, auth);
    this.userTools.register(this.server, auth);
    this.endpointTools.register(this.server, auth);
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
      const publicUrl = this.configService.get<string>('PUBLIC_URL');
      const tokenUrl = publicUrl ? `${publicUrl}/get-mcp-token` : null;

      let message =
        'Not authenticated. ASK THE USER which method they prefer:\n\n';
      message += '1. [Recommended] Login with access token:\n';
      if (tokenUrl) {
        message += `   - User should open ${tokenUrl} to get their token\n`;
      }
      message += '   - Then use: loginWithToken(accessToken)\n\n';
      message += '2. Login with credentials:\n';
      message += '   - Ask user for their username and password\n';
      message += '   - Then use: login(username, password)\n\n';
      message += 'IMPORTANT: DO NOT assume or guess credentials.';

      throw new Error(message);
    }
    return session;
  }

  private async checkPermissionByRevision(
    revisionId: string,
    permissions: McpPermissionCheck[],
    userId: string,
  ): Promise<void> {
    await this.authApi.checkProjectPermission({
      revisionId,
      permissions,
      userId,
    });
  }

  private async checkPermissionByOrganizationProject(
    organizationId: string,
    projectName: string,
    permissions: McpPermissionCheck[],
    userId: string,
  ): Promise<void> {
    await this.authApi.checkProjectPermission({
      organizationId,
      projectName,
      permissions,
      userId,
    });
  }

  private async checkPermissionByOrganization(
    organizationId: string,
    permissions: McpPermissionCheck[],
    userId?: string,
  ): Promise<void> {
    await this.authApi.checkOrganizationPermission({
      organizationId,
      permissions,
      userId,
    });
  }
}
