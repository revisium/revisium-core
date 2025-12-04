import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpSession } from './mcp-session.service';

export type McpContext = { sessionId?: string };

export interface McpPermissionCheck {
  action: PermissionAction;
  subject: PermissionSubject;
}

export type CheckPermissionByRevision = (
  revisionId: string,
  permissions: McpPermissionCheck[],
  userId: string,
) => Promise<void>;

export type CheckPermissionByOrganizationProject = (
  organizationId: string,
  projectName: string,
  permissions: McpPermissionCheck[],
  userId: string,
) => Promise<void>;

export interface McpAuthHelpers {
  requireAuth: (context: McpContext) => McpSession;
  checkPermissionByRevision: CheckPermissionByRevision;
  checkPermissionByOrganizationProject: CheckPermissionByOrganizationProject;
}

export interface McpToolRegistrar {
  register(server: McpServer, auth: McpAuthHelpers): void;
}

export interface McpResourceRegistrar {
  register(server: McpServer): void;
}
