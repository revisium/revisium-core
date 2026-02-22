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
    server.registerTool(
      'get_project',
      {
        description:
          'Get project by organization ID and project name. Returns project info with rootBranch containing draftRevisionId and headRevisionId.',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
          projectName: z.string().describe('Project name'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ organizationId, projectName }) => {
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

    server.registerTool(
      'create_project',
      {
        description: 'Create a new project in an organization',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
          projectName: z.string().describe('Project name (URL-friendly)'),
          branchName: z
            .string()
            .optional()
            .describe('Initial branch name (default: master)'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ organizationId, projectName, branchName }) => {
        const project = await this.projectApi.apiCreateProject({
          organizationId,
          projectName,
          branchName,
        });

        const branch = await this.branchApi.getBranch({
          organizationId,
          projectName,
          branchName: branchName || 'master',
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

    server.registerTool(
      'update_project',
      {
        description: 'Update project settings',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
          projectName: z.string().describe('Project name'),
          isPublic: z
            .boolean()
            .describe('Whether the project is publicly accessible'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ organizationId, projectName, isPublic }) => {
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.update,
              subject: PermissionSubject.Project,
            },
          ],
          auth.userId,
        );
        const result = await this.projectApi.updateProject({
          organizationId,
          projectName,
          isPublic,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'delete_project',
      {
        description: 'Delete a project',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
          projectName: z.string().describe('Project name'),
        },
        annotations: { readOnlyHint: false, destructiveHint: true },
      },
      async ({ organizationId, projectName }) => {
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.delete,
              subject: PermissionSubject.Project,
            },
          ],
          auth.userId,
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
