import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { McpAuthHelpers, McpToolRegistrar } from '../types';
import {
  UriRevisionResolver,
  resolveRevisionId,
  revisionIdOrUri,
  resolveBranchParams,
  branchParamsOrUri,
} from '../uri';

export class RevisionTools implements McpToolRegistrar {
  constructor(
    private readonly projectApi: ProjectApiService,
    private readonly revisions: RevisionsApiService,
    private readonly uriResolver: UriRevisionResolver,
  ) {}

  private async resolveProjectId(
    organizationId: string,
    projectName: string,
  ): Promise<string> {
    const project = await this.projectApi.getProject({
      organizationId,
      projectName,
    });
    return project.id;
  }

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'get_revision',
      {
        description: 'Get revision details',
        inputSchema: {
          ...revisionIdOrUri,
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId: rawRevisionId, uri }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
        );
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          auth.userId,
        );
        const result = await this.revisions.getRevision({ revisionId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'get_parent_revision',
      {
        description:
          'Get the parent revision of a given revision. Returns null if the revision is the root (first) revision.',
        inputSchema: {
          ...revisionIdOrUri,
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId: rawRevisionId, uri }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
        );
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          auth.userId,
        );
        const result = await this.revisions.getRevisionParent(revisionId);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ parent: result ?? null }, null, 2),
            },
          ],
        };
      },
    );

    server.registerTool(
      'create_revision',
      {
        description:
          'Commit changes in a draft revision. CRITICAL: ALWAYS ask user for permission before committing. Never commit automatically - head/draft may point to different environments and committing without permission can break production.',
        inputSchema: {
          ...branchParamsOrUri,
          comment: z.string().optional().describe('Commit comment'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({
        organizationId: rawOrgId,
        projectName: rawProjName,
        branchName: rawBranchName,
        uri,
        comment,
      }) => {
        const { organizationId, projectName, branchName } = resolveBranchParams(
          {
            organizationId: rawOrgId,
            projectName: rawProjName,
            branchName: rawBranchName,
            uri,
          },
        );
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.create,
              subject: PermissionSubject.Revision,
            },
          ],
          auth.userId,
        );
        const projectId = await this.resolveProjectId(
          organizationId,
          projectName,
        );
        const result = await this.revisions.createRevision({
          projectId,
          branchName,
          comment,
        });
        const resolvedComment = result.comment ?? comment;
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  committed: true,
                  revisionId: result.id,
                  ...(resolvedComment ? { comment: resolvedComment } : {}),
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );
  }
}
