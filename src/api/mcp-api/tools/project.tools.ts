import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { BranchApiService } from 'src/features/branch/branch-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class ProjectTools implements McpToolRegistrar {
  constructor(
    private readonly projectApi: ProjectApiService,
    private readonly branchApi: BranchApiService,
  ) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.tool(
      'getProject',
      'Get project by organization ID and project name. Returns project info with rootBranch containing draftRevisionId and headRevisionId.',
      {
        organizationId: z.string().describe('Organization ID'),
        projectName: z.string().describe('Project name'),
      },
      { readOnlyHint: true },
      async ({ organizationId, projectName }, context) => {
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
        const project = await this.projectApi.getProject({
          organizationId,
          projectName,
        });

        const rootBranch = await this.projectApi.getRootBranchByProject(
          project.id,
        );

        const draftRevision = await this.branchApi.getDraftRevision(
          rootBranch.id,
        );
        const headRevision = await this.branchApi.getHeadRevision(
          rootBranch.id,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ...project,
                  rootBranch: {
                    id: rootBranch.id,
                    name: rootBranch.name,
                    draftRevisionId: draftRevision.id,
                    headRevisionId: headRevision.id,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      'createProject',
      'Create a new project in an organization',
      {
        organizationId: z.string().describe('Organization ID'),
        projectName: z.string().describe('Project name (URL-friendly)'),
        branchName: z
          .string()
          .optional()
          .describe('Initial branch name (default: main)'),
      },
      { readOnlyHint: false, destructiveHint: false },
      async ({ organizationId, projectName, branchName }, context) => {
        auth.requireAuth(context);
        const project = await this.projectApi.apiCreateProject({
          organizationId,
          projectName,
          branchName,
        });

        const branch = await this.branchApi.getBranch({
          organizationId,
          projectName,
          branchName: branchName || 'main',
        });

        const draftRevision = await this.branchApi.getDraftRevision(branch.id);
        const headRevision = await this.branchApi.getHeadRevision(branch.id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ...project,
                  branch: {
                    id: branch.id,
                    name: branch.name,
                    draftRevisionId: draftRevision.id,
                    headRevisionId: headRevision.id,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.tool(
      'deleteProject',
      'Delete a project',
      {
        organizationId: z.string().describe('Organization ID'),
        projectName: z.string().describe('Project name'),
      },
      { readOnlyHint: false, destructiveHint: true },
      async ({ organizationId, projectName }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.delete,
              subject: PermissionSubject.Project,
            },
          ],
          session.userId,
        );
        const result = await this.projectApi.deleteProject({
          organizationId,
          projectName,
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
