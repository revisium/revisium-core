import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EndpointApiService } from 'src/features/endpoint/queries/endpoint-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

const EndpointTypeEnum = z.enum(['GRAPHQL', 'REST_API']);

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
  constructor(
    private readonly endpointApi: EndpointApiService,
    private readonly endpointServiceUrl?: string,
  ) {}

  private getEndpointServiceUrl(): string {
    return this.endpointServiceUrl || 'http://localhost:8081';
  }

  private async buildEndpointPath(endpointId: string): Promise<{
    orgId: string;
    projectName: string;
    branchName: string;
    postfix: string;
    endpoint: { id: string; type: string };
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
        auth.requireAuth(context);
        const result = await this.endpointApi.getEndpointRelatives({
          endpointId,
        });
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
        auth.requireAuth(context);
        const path = await this.buildEndpointPath(endpointId);

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

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: INTROSPECTION_QUERY }),
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
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: `Failed to fetch GraphQL schema: ${error instanceof Error ? error.message : String(error)}`,
                    url,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
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
        auth.requireAuth(context);
        const path = await this.buildEndpointPath(endpointId);

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

        try {
          const response = await fetch(url);

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
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: `Failed to fetch OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`,
                    url,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }
      },
    );
  }
}
