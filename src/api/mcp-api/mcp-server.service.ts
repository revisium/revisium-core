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
import { McpUserContext } from './mcp-auth.service';
import { McpAuthHelpers, McpPermissionCheck } from './types';
import { UriRevisionResolver } from './uri';

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
  private readonly uriResolver: UriRevisionResolver;

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
  ) {
    const authSection = this.noAuth.enabled
      ? `AUTHENTICATION:
No authentication required. All tools are available immediately.`
      : `AUTHENTICATION:
Authentication is handled automatically via OAuth or Bearer token in the HTTP header.
No login tools needed — all tools are available immediately after authentication.`;

    this.instructions = `Revisium is a versioned data platform with Git-like version control. Use it as a headless CMS, dictionary service, configuration store, or structured memory for AI agents. Agents can design their own schemas (tables, fields, foreign keys), organize data relationships, and evolve the structure as needs change — all with branching, rollback, and human review.

${authSection}

DATA STRUCTURE (hierarchy):
Organization → Project → Branch → Revision → Table → Row

- Organization: top-level container, identified by organizationId (= owner's username)
- Project: belongs to an organization, has a default branch (usually "master")
- Branch: has headRevisionId (committed, read-only) and draftRevisionId (working state)
- Revision: immutable snapshot of all tables and rows
- Table: has schema (JSON Schema) and rows within a revision
- Row: data record identified by rowId within a table

URI PARAMETER:
Most tools accept a "uri" parameter as an alternative to "revisionId". The server resolves it internally — no need to call get_branch first.
- Format: "org/project/branch[:revision]" or full "revisium://host/org/project/branch[:revision]"
- Revision values: "draft" (default if omitted), "head" (committed), or specific revision ID
- Mutations only allow draft — :head or :specificId will error
- Provide either "uri" or "revisionId", not both

TYPICAL WORKFLOW:
1. Explore: get_tables(uri: "org/project/branch", includeSchema: true, includeRowCount: true) — get all tables with schemas and counts in one call
2. Read: get_rows(uri: "org/project/branch", tableId: "...")
3. Create: create_table(uri: "...", tableId: "...", schema: {...}, rows: [...]) — create table with initial rows in one call
4. Mutate: create_row/patch_row(uri: "org/project/branch", ...) — mutations return compact { id } response
5. Review: get_revision_changes(uri: "org/project/branch")
6. Commit: create_revision(uri: "org/project/branch", comment: "...") — only after user approval
7. Read committed: get_rows(uri: "org/project/branch:head", tableId: "...")

Legacy: revisionId parameter still works for all tools.

SEARCHING DATA:
- search_rows(uri: "org/project/branch", query: "keyword") - full-text search across ALL tables and ALL fields
- No tableId needed - searches everything
- By default returns compact results: rowId, tableId, and matches (field path, value, highlight) - saves tokens
- Set includeRowData=true to get full row data in results (use sparingly for large datasets)
- Recommended workflow: search_rows to find rows, then get_row for full data of specific rows

UPDATING DATA — patch_row vs update_row:
- update_row REPLACES all row data — you must send the complete object with ALL fields
- patch_row updates ONLY the specified fields — much more efficient when changing 1-2 fields
- Prefer patch_row when you know which fields to change: patch_row(revisionId, tableId, rowId, [{"op":"replace","path":"title","value":"New Title"}])
- Use update_row only when replacing the entire row data
- Same applies to batch operations: patch_rows vs update_rows

IMPORTANT:
- Prefer using "uri" parameter over "revisionId" — it avoids the extra get_branch step
- Project.rootBranch contains the default branch info (when using legacy revisionId flow)
- Mutations require draft revision — use uri without :revision suffix or with :draft

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

    this.schemaResource = new SchemaResource();
    this.queryResource = new QueryResource();
    this.migrationResource = new MigrationResource();
    this.fileResource = new FileResource();

    this.uriResolver = new UriRevisionResolver(this.branchApi);

    this.organizationTools = new OrganizationTools(this.organizationApi);
    this.projectTools = new ProjectTools(this.projectApi, this.branchApi);
    this.branchTools = new BranchTools(this.branchApi);
    this.tableTools = new TableTools(
      this.tableApi,
      this.draftApi,
      this.uriResolver,
    );
    this.rowTools = new RowTools(this.rowApi, this.draftApi, this.uriResolver);
    this.revisionTools = new RevisionTools(
      this.revisionsApi,
      this.draftApi,
      this.uriResolver,
    );
    this.revisionChangesTools = new RevisionChangesTools(
      this.revisionChangesApi,
      this.uriResolver,
    );
    this.migrationTools = new MigrationTools(
      this.revisionsApi,
      this.draftApi,
      this.uriResolver,
    );
    this.userTools = new UserTools(this.userApi);
    this.endpointTools = new EndpointTools(
      this.endpointApi,
      this.configService.get<string>('ENDPOINT_SERVICE_URL'),
      this.uriResolver,
    );
    this.fileTools = new FileTools(this.draftApi, this.uriResolver);
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
