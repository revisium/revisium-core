import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';

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

export type CheckPermissionByOrganization = (
  organizationId: string,
  permissions: McpPermissionCheck[],
  userId?: string,
) => Promise<void>;

export type CheckSystemPermission = (
  permissions: McpPermissionCheck[],
  userId: string,
) => Promise<void>;

export interface McpAuthHelpers {
  userId: string;
  checkPermissionByRevision: CheckPermissionByRevision;
  checkPermissionByOrganizationProject: CheckPermissionByOrganizationProject;
  checkPermissionByOrganization: CheckPermissionByOrganization;
  checkSystemPermission: CheckSystemPermission;
}

export interface McpToolRegistrar {
  register(server: McpServer, auth: McpAuthHelpers): void;
}

export interface McpResourceRegistrar {
  register(server: McpServer): void;
}
