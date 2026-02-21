import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { NoAuthService } from 'src/features/auth/no-auth.service';
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
import { FormulaService } from 'src/features/plugin/formula';
import { McpSession, McpSessionService } from './mcp-session.service';
import { McpAuthHelpers, McpContext, McpPermissionCheck } from './types';

import {
  SchemaResource,
  QueryResource,
  MigrationResource,
  FileResource,
} from './resources';

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
  FileTools,
} from './tools';

@Injectable()
export class McpServerService {
  private readonly instructions: string;
  private readonly auth: McpAuthHelpers;

  private readonly schemaResource: SchemaResource;
  private readonly queryResource: QueryResource;
  private readonly migrationResource: MigrationResource;
  private readonly fileResource: FileResource;

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
  private readonly fileTools: FileTools;

  constructor(
    private readonly configService: ConfigService,
    private readonly mcpSession: McpSessionService,
    private readonly noAuth: NoAuthService,
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
    private readonly formulaService: FormulaService,
  ) {
    const publicUrl = this.configService.get<string>('PUBLIC_URL');
    const tokenUrl = publicUrl ? `${publicUrl}/get-mcp-token` : null;

    const authSection = this.noAuth.enabled
      ? `AUTHENTICATION:
No authentication required. All tools are available immediately without calling login() or login_with_token().`
      : `AUTHENTICATION:
When not authenticated, ASK THE USER which method they prefer:
1. [Recommended] Token auth: User opens ${tokenUrl || '<PUBLIC_URL>/get-mcp-token'} to get token, then use login_with_token(token)
2. Credentials: Ask user for username/password, then use login(username, password)
DO NOT assume or guess credentials.`;

    this.instructions = `Revisium is a headless CMS with Git-like version control.

${authSection}

DATA STRUCTURE:
- Organization: contains projects (organizationId is usually the owner's username)
- Project: has a default branch (usually "master"), contains tables and rows
- Branch: has headRevisionId (committed state) and draftRevisionId (working state)
- Revision: immutable snapshot; use draftRevisionId for all changes
- Table: has schema (JSON Schema) and rows
- Row: data record with rowId

TYPICAL WORKFLOW:
1. me() - check auth status
2. get_project(organizationId, projectName) - returns project with rootBranch info
3. get_branch(organizationId, projectName, branchName) - get branch details including draftRevisionId
4. Use draftRevisionId for: get_tables, get_rows, create_row, update_row, etc.
5. get_revision_changes(draftRevisionId) - review pending changes before commit
6. create_revision() - only after user approval

SEARCHING DATA:
- search_rows(revisionId, query) - full-text search across ALL tables and ALL fields in a revision
- No tableId needed - searches everything
- Returns matches with: row data, table info (id, name), match details (field path, value, highlight)
- Use this to find data when you don't know the exact table or rowId
- Example: search_rows(revisionId, "TableEditor") finds all rows mentioning "TableEditor"

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

    this.schemaResource = new SchemaResource(this.formulaService);
    this.queryResource = new QueryResource();
    this.migrationResource = new MigrationResource();
    this.fileResource = new FileResource();

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
    this.fileTools = new FileTools(this.draftApi);

    this.auth = {
      requireAuth: this.requireAuth.bind(this),
      checkPermissionByRevision: this.checkPermissionByRevision.bind(this),
      checkPermissionByOrganizationProject:
        this.checkPermissionByOrganizationProject.bind(this),
      checkPermissionByOrganization:
        this.checkPermissionByOrganization.bind(this),
      checkSystemPermission: this.checkSystemPermission.bind(this),
    };
  }

  public createServer(): McpServer {
    const server = new McpServer(
      {
        name: 'revisium',
        version: '1.0.0',
      },
      {
        instructions: this.instructions,
      },
    );

    this.schemaResource.register(server);
    this.queryResource.register(server);
    this.migrationResource.register(server);
    this.fileResource.register(server);

    this.authTools.register(server, this.auth);
    this.organizationTools.register(server, this.auth);
    this.projectTools.register(server, this.auth);
    this.branchTools.register(server, this.auth);
    this.tableTools.register(server, this.auth);
    this.rowTools.register(server, this.auth);
    this.revisionTools.register(server, this.auth);
    this.revisionChangesTools.register(server, this.auth);
    this.migrationTools.register(server, this.auth);
    this.userTools.register(server, this.auth);
    this.endpointTools.register(server, this.auth);
    this.fileTools.register(server, this.auth);

    return server;
  }

  private getSessionFromContext(context: McpContext): McpSession | null {
    if (!context?.sessionId) return null;
    return this.mcpSession.getSession(context.sessionId);
  }

  private requireAuth(context: McpContext): McpSession {
    if (this.noAuth.enabled) {
      const admin = this.noAuth.adminUser;
      return {
        userId: admin.userId,
        username: admin.userId,
        email: admin.email,
        roleId: 'systemAdmin',
      };
    }

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
      message += '   - Then use: login_with_token(accessToken)\n\n';
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

  private async checkSystemPermission(
    permissions: McpPermissionCheck[],
    userId: string,
  ): Promise<void> {
    await this.authApi.checkSystemPermission({
      permissions,
      userId,
    });
  }
}
