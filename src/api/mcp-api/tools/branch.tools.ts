import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class BranchTools implements McpToolRegistrar {
  constructor(private readonly branchApi: BranchApiService) {}

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
      async ({ organizationId, projectName, branchName }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          session.userId,
        );
        const branch = await this.branchApi.getBranch({
          organizationId,
          projectName,
          branchName,
        });
        const [headRevision, draftRevision] = await Promise.all([
          this.branchApi.getHeadRevision(branch.id),
          this.branchApi.getDraftRevision(branch.id),
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
      async ({ branchId }, context) => {
        auth.requireAuth(context);
        const result = await this.branchApi.getDraftRevision(branchId);
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
      async ({ revisionId, branchName }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.create,
              subject: PermissionSubject.Branch,
            },
          ],
          session.userId,
        );
        const result = await this.branchApi.apiCreateBranchByRevisionId({
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
      async ({ organizationId, projectName, first, after }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          session.userId,
        );
        const result = await this.branchApi.getBranches({
          organizationId,
          projectName,
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
      async (
        { organizationId, projectName, branchName, first, after },
        context,
      ) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          session.userId,
        );
        const branch = await this.branchApi.getBranch({
          organizationId,
          projectName,
          branchName,
        });
        const result = await this.branchApi.getRevisionsByBranchId({
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
      async ({ organizationId, projectName, branchName }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.delete,
              subject: PermissionSubject.Branch,
            },
          ],
          session.userId,
        );
        const result = await this.branchApi.deleteBranch({
          organizationId,
          projectName,
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
          organizationId: z.string().describe('Organization ID'),
          projectName: z.string().describe('Project name'),
          branchName: z.string().describe('Branch name'),
        },
        annotations: { readOnlyHint: false, destructiveHint: true },
      },
      async ({ organizationId, projectName, branchName }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.revert,
              subject: PermissionSubject.Revision,
            },
          ],
          session.userId,
        );
        const result = await this.branchApi.apiRevertChanges({
          organizationId,
          projectName,
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
