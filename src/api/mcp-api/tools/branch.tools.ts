import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BranchApiService } from 'src/core/branch/branch-api.service';
import { RevisionApiService } from 'src/core/revision/revision-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { McpAuthHelpers, McpToolRegistrar } from '../types';
import { resolveBranchParams, branchParamsOrUri } from '../uri';

export class BranchTools implements McpToolRegistrar {
  constructor(
    private readonly projectApi: ProjectApiService,
    private readonly branches: BranchApiService,
    private readonly revisions: RevisionApiService,
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
      'get_branch',
      {
        description: 'Get branch by organization, project and branch name',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
          projectName: z.string().describe('Project name'),
          branchName: z.string().describe('Branch name'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ organizationId, projectName, branchName }) => {
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          auth.userId,
        );
        const projectId = await this.resolveProjectId(
          organizationId,
          projectName,
        );
        const branch = await this.branches.getBranch({
          projectId,
          branchName,
        });
        const [headRevision, draftRevision] = await Promise.all([
          this.branches.getHeadRevision(branch.id),
          this.branches.getDraftRevision(branch.id),
        ]);
        const result = {
          ...branch,
          headRevisionId: headRevision.id,
          draftRevisionId: draftRevision.id,
        };
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'get_draft_revision',
      {
        description: 'Get draft revision for a branch',
        inputSchema: {
          branchId: z.string().describe('Branch ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ branchId }) => {
        const result = await this.branches.getDraftRevision(branchId);
        await auth.checkPermissionByRevision(
          result.id,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          auth.userId,
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'create_branch',
      {
        description: 'Create a new branch from a revision',
        inputSchema: {
          revisionId: z.string().describe('Source revision ID'),
          branchName: z.string().describe('New branch name'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId, branchName }) => {
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.create,
              subject: PermissionSubject.Branch,
            },
          ],
          auth.userId,
        );
        const result = await this.branches.createBranch({
          revisionId,
          branchName,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'get_branches',
      {
        description: 'List branches in a project',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
          projectName: z.string().describe('Project name'),
          first: z
            .number()
            .optional()
            .describe('Number of items (default 100)'),
          after: z.string().optional().describe('Cursor'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ organizationId, projectName, first, after }) => {
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          auth.userId,
        );
        const projectId = await this.resolveProjectId(
          organizationId,
          projectName,
        );
        const result = await this.branches.getBranches({
          projectId,
          first: first ?? 100,
          after,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'get_revisions',
      {
        description: 'List revisions in a branch',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
          projectName: z.string().describe('Project name'),
          branchName: z.string().describe('Branch name'),
          first: z
            .number()
            .optional()
            .describe('Number of items (default 100)'),
          after: z.string().optional().describe('Cursor'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ organizationId, projectName, branchName, first, after }) => {
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          auth.userId,
        );
        const projectId = await this.resolveProjectId(
          organizationId,
          projectName,
        );
        const branch = await this.branches.getBranch({
          projectId,
          branchName,
        });
        const result = await this.revisions.getRevisionsByBranchId({
          branchId: branch.id,
          first: first ?? 100,
          after,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'delete_branch',
      {
        description: 'Delete a branch',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
          projectName: z.string().describe('Project name'),
          branchName: z.string().describe('Branch name'),
        },
        annotations: { readOnlyHint: false, destructiveHint: true },
      },
      async ({ organizationId, projectName, branchName }) => {
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.delete,
              subject: PermissionSubject.Branch,
            },
          ],
          auth.userId,
        );
        const projectId = await this.resolveProjectId(
          organizationId,
          projectName,
        );
        const result = await this.branches.deleteBranch({
          projectId,
          branchName,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'revert_changes',
      {
        description: 'Revert all uncommitted changes in a branch',
        inputSchema: {
          ...branchParamsOrUri,
        },
        annotations: { readOnlyHint: false, destructiveHint: true },
      },
      async ({
        organizationId: rawOrgId,
        projectName: rawProjName,
        branchName: rawBranchName,
        uri,
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
              action: PermissionAction.revert,
              subject: PermissionSubject.Revision,
            },
          ],
          auth.userId,
        );
        const projectId = await this.resolveProjectId(
          organizationId,
          projectName,
        );
        const result = await this.revisions.revertChanges({
          projectId,
          branchName,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );
  }
}
