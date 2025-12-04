import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class BranchTools implements McpToolRegistrar {
  constructor(private readonly branchApi: BranchApiService) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.tool(
      'getBranch',
      'Get branch by organization, project and branch name',
      {
        organizationId: z.string().describe('Organization ID'),
        projectName: z.string().describe('Project name'),
        branchName: z.string().describe('Branch name'),
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
        const result = await this.branchApi.getBranch({
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

    server.tool(
      'getDraftRevision',
      'Get draft revision for a branch',
      {
        branchId: z.string().describe('Branch ID'),
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

    server.tool(
      'createBranch',
      'Create a new branch from a revision',
      {
        revisionId: z.string().describe('Source revision ID'),
        branchName: z.string().describe('New branch name'),
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

    server.tool(
      'revertChanges',
      'Revert all uncommitted changes in a branch',
      {
        organizationId: z.string().describe('Organization ID'),
        projectName: z.string().describe('Project name'),
        branchName: z.string().describe('Branch name'),
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
