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
import { McpUserContext } from './mcp-auth.service';
import { McpAuthHelpers, McpPermissionCheck } from './types';

import {
  SchemaResource,
  QueryResource,
  MigrationResource,
  FileResource,
} from './resources';

import {
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

  private readonly schemaResource: SchemaResource;
  private readonly queryResource: QueryResource;
  private readonly migrationResource: MigrationResource;
  private readonly fileResource: FileResource;

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
    const authSection = this.noAuth.enabled
      ? `AUTHENTICATION:
No authentication required. All tools are available immediately.`
      : `AUTHENTICATION:
Authentication is handled automatically via OAuth or Bearer token in the HTTP header.
No login tools needed — all tools are available immediately after authentication.`;

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
1. get_project(organizationId, projectName) - returns project with rootBranch info
2. get_branch(organizationId, projectName, branchName) - get branch details including draftRevisionId
3. Use draftRevisionId for: get_tables, get_rows, create_row, update_row, etc.
4. get_revision_changes(draftRevisionId) - review pending changes before commit
5. create_revision() - only after user approval

SEARCHING DATA:
- search_rows(revisionId, query) - full-text search across ALL tables and ALL fields in a revision
- No tableId needed - searches everything
- By default returns compact results: rowId, tableId, and matches (field path, value, highlight) - saves tokens
- Set includeRowData=true to get full row data in results (use sparingly for large datasets)
- Recommended workflow: search_rows to find rows, then get_row for full data of specific rows
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
  }

  public getInstructions(): string {
    return this.instructions;
  }

  public registerResources(server: McpServer): void {
    this.schemaResource.register(server);
    this.queryResource.register(server);
    this.migrationResource.register(server);
    this.fileResource.register(server);
  }

  public registerTools(server: McpServer, userContext: McpUserContext): void {
    const auth: McpAuthHelpers = {
      userId: userContext.userId,
      checkPermissionByRevision: this.checkPermissionByRevision.bind(this),
      checkPermissionByOrganizationProject:
        this.checkPermissionByOrganizationProject.bind(this),
      checkPermissionByOrganization:
        this.checkPermissionByOrganization.bind(this),
      checkSystemPermission: this.checkSystemPermission.bind(this),
    };

    this.organizationTools.register(server, auth);
    this.projectTools.register(server, auth);
    this.branchTools.register(server, auth);
    this.tableTools.register(server, auth);
    this.rowTools.register(server, auth);
    this.revisionTools.register(server, auth);
    this.revisionChangesTools.register(server, auth);
    this.migrationTools.register(server, auth);
    this.userTools.register(server, auth);
    this.endpointTools.register(server, auth);
    this.fileTools.register(server, auth);
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
