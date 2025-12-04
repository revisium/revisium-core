import { Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EndpointApiService } from 'src/features/endpoint/queries/endpoint-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

const EndpointTypeEnum = z.enum(['GRAPHQL', 'REST_API']);

const FETCH_TIMEOUT_MS = 30000;

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      types {
        ...FullType
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
    }
    inputFields {
      ...InputValue
    }
    enumValues(includeDeprecated: true) {
      name
      description
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type {
      ...TypeRef
    }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
          }
        }
      }
    }
  }
`;

export class EndpointTools implements McpToolRegistrar {
  private readonly logger = new Logger(EndpointTools.name);
  private hasWarnedAboutFallbackUrl = false;

  constructor(
    private readonly endpointApi: EndpointApiService,
    private readonly endpointServiceUrl?: string,
  ) {}

  private getEndpointServiceUrl(): string {
    if (!this.endpointServiceUrl) {
      if (!this.hasWarnedAboutFallbackUrl) {
        this.logger.warn(
          'ENDPOINT_SERVICE_URL is not configured, using fallback http://localhost:8081',
        );
        this.hasWarnedAboutFallbackUrl = true;
      }
      return 'http://localhost:8081';
    }
    return this.endpointServiceUrl;
  }

  private async buildEndpointPath(endpointId: string): Promise<{
    orgId: string;
    projectName: string;
    branchName: string;
    postfix: string;
    endpoint: { id: string; type: string };
    project: { organizationId: string; name: string };
  }> {
    const relatives = await this.endpointApi.getEndpointRelatives({
      endpointId,
    });
    const { endpoint, revision, branch, project } = relatives;
    return {
      orgId: encodeURIComponent(project.organizationId),
      projectName: encodeURIComponent(project.name),
      branchName: encodeURIComponent(branch.name),
      postfix: revision.isDraft ? 'draft' : revision.id,
      endpoint: { id: endpoint.id, type: endpoint.type },
      project: { organizationId: project.organizationId, name: project.name },
    };
  }

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.tool(
      'getProjectEndpoints',
      'Get all endpoints for a project',
      {
        organizationId: z.string().describe('Organization ID'),
        projectName: z.string().describe('Project name'),
        branchId: z.string().optional().describe('Filter by branch ID'),
        type: EndpointTypeEnum.optional().describe(
          'Filter by endpoint type (GRAPHQL or REST_API)',
        ),
        first: z.number().optional().describe('Number of items to fetch'),
        after: z.string().optional().describe('Cursor for pagination'),
      },
      { readOnlyHint: true },
      async (
        { organizationId, projectName, branchId, type, first, after },
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
        const result = await this.endpointApi.getProjectEndpoints({
          organizationId,
          projectName,
          branchId,
          type,
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

    server.tool(
      'getEndpointRelatives',
      'Get endpoint with all related entities (revision, branch, project)',
      {
        endpointId: z.string().describe('Endpoint ID'),
      },
      { readOnlyHint: true },
      async ({ endpointId }, context) => {
        const session = auth.requireAuth(context);
        const result = await this.endpointApi.getEndpointRelatives({
          endpointId,
        });
        await auth.checkPermissionByOrganizationProject(
          result.project.organizationId,
          result.project.name,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          session.userId,
        );
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'createEndpoint',
      'Create a new endpoint for a revision. Endpoints expose revision data via GraphQL or REST API.',
      {
        revisionId: z.string().describe('Revision ID to expose'),
        type: EndpointTypeEnum.describe(
          'Endpoint type: GRAPHQL for GraphQL API, REST_API for REST/OpenAPI',
        ),
      },
      { readOnlyHint: false, destructiveHint: false },
      async ({ revisionId, type }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.create,
              subject: PermissionSubject.Endpoint,
            },
          ],
          session.userId,
        );
        const result = await this.endpointApi.apiCreateEndpoint({
          revisionId,
          type,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'deleteEndpoint',
      'Delete an endpoint',
      {
        endpointId: z.string().describe('Endpoint ID to delete'),
      },
      { readOnlyHint: false, destructiveHint: true },
      async ({ endpointId }, context) => {
        const session = auth.requireAuth(context);
        const relatives = await this.endpointApi.getEndpointRelatives({
          endpointId,
        });
        await auth.checkPermissionByOrganizationProject(
          relatives.project.organizationId,
          relatives.project.name,
          [
            {
              action: PermissionAction.delete,
              subject: PermissionSubject.Endpoint,
            },
          ],
          session.userId,
        );
        await this.endpointApi.deleteEndpoint({ endpointId });
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true }, null, 2),
            },
          ],
        };
      },
    );

    server.tool(
      'getGraphQLSchema',
      'Fetch GraphQL schema (introspection) from a GRAPHQL endpoint. Returns the full schema introspection result that describes all types, queries, and mutations available.',
      {
        endpointId: z.string().describe('Endpoint ID (must be GRAPHQL type)'),
      },
      { readOnlyHint: true },
      async ({ endpointId }, context) => {
        const session = auth.requireAuth(context);
        const path = await this.buildEndpointPath(endpointId);
        await auth.checkPermissionByOrganizationProject(
          path.project.organizationId,
          path.project.name,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          session.userId,
        );

        if (path.endpoint.type !== 'GRAPHQL') {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: `Endpoint is of type ${path.endpoint.type}, not GRAPHQL`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const baseUrl = this.getEndpointServiceUrl();
        const url = `${baseUrl}/endpoint/graphql/${path.orgId}/${path.projectName}/${path.branchName}/${path.postfix}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          FETCH_TIMEOUT_MS,
        );

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: INTROSPECTION_QUERY }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify(result, null, 2) },
            ],
          };
        } catch (error) {
          const message =
            error instanceof Error && error.name === 'AbortError'
              ? 'Request timed out'
              : error instanceof Error
                ? error.message
                : String(error);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: `Failed to fetch GraphQL schema: ${message}`,
                    url,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } finally {
          clearTimeout(timeoutId);
        }
      },
    );

    server.tool(
      'getOpenAPISpec',
      'Fetch OpenAPI/Swagger specification from a REST_API endpoint. Returns the full OpenAPI JSON spec that describes all routes, parameters, and schemas.',
      {
        endpointId: z.string().describe('Endpoint ID (must be REST_API type)'),
      },
      { readOnlyHint: true },
      async ({ endpointId }, context) => {
        const session = auth.requireAuth(context);
        const path = await this.buildEndpointPath(endpointId);
        await auth.checkPermissionByOrganizationProject(
          path.project.organizationId,
          path.project.name,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          session.userId,
        );

        if (path.endpoint.type !== 'REST_API') {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: `Endpoint is of type ${path.endpoint.type}, not REST_API`,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const baseUrl = this.getEndpointServiceUrl();
        const url = `${baseUrl}/endpoint/openapi/${path.orgId}/${path.projectName}/${path.branchName}/${path.postfix}/openapi.json`;

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          FETCH_TIMEOUT_MS,
        );

        try {
          const response = await fetch(url, { signal: controller.signal });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          return {
            content: [
              { type: 'text' as const, text: JSON.stringify(result, null, 2) },
            ],
          };
        } catch (error) {
          const message =
            error instanceof Error && error.name === 'AbortError'
              ? 'Request timed out'
              : error instanceof Error
                ? error.message
                : String(error);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: `Failed to fetch OpenAPI spec: ${message}`,
                    url,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } finally {
          clearTimeout(timeoutId);
        }
      },
    );
  }
}
