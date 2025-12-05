import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { McpSession, McpSessionService } from '../mcp-session.service';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class AuthTools implements McpToolRegistrar {
  constructor(
    private readonly mcpSession: McpSessionService,
    private readonly authApi: AuthApiService,
    private readonly publicUrl?: string,
  ) {}

  register(server: McpServer, _auth: McpAuthHelpers): void {
    server.registerTool(
      'login',
      {
        description:
          'Authenticate with Revisium API using username and password',
        inputSchema: {
          username: z.string().describe('Username'),
          password: z.string().describe('Password'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ username, password }, context) => {
        try {
          const result = await this.authApi.login({
            emailOrUsername: username,
            password,
          });

          const session = this.mcpSession.verifyToken(result.accessToken);
          if (!session) {
            throw new Error('Failed to verify token');
          }

          if (context.sessionId) {
            this.mcpSession.createSession(
              context.sessionId,
              result.accessToken,
              session,
            );
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: true,
                    user: {
                      id: session.userId,
                      username: session.username,
                      email: session.email,
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error:
                      error instanceof Error
                        ? error.message
                        : 'Authentication failed',
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

    server.registerTool(
      'loginWithToken',
      {
        description:
          'Authenticate with Revisium API using an existing JWT access token. Useful when already logged in via UI (Google, GitHub, or password).',
        inputSchema: {
          accessToken: z.string().describe('JWT access token from Revisium UI'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ accessToken }, context) => {
        try {
          const session = this.mcpSession.verifyToken(accessToken);
          if (!session) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      success: false,
                      error: 'Invalid or expired token',
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          if (context.sessionId) {
            this.mcpSession.createSession(
              context.sessionId,
              accessToken,
              session,
            );
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: true,
                    user: {
                      id: session.userId,
                      username: session.username,
                      email: session.email,
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error:
                      error instanceof Error
                        ? error.message
                        : 'Token verification failed',
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

    server.registerTool(
      'me',
      {
        description: 'Get current authenticated user information',
        inputSchema: {},
        annotations: { readOnlyHint: true },
      },
      async (_args, context) => {
        const session = this.getSessionFromContext(context);
        if (!session) {
          const tokenUrl = this.publicUrl
            ? `${this.publicUrl}/get-mcp-token`
            : null;

          const authOptions = {
            authenticated: false,
            message:
              'Not authenticated. ASK THE USER which authentication method they prefer:',
            options: [
              {
                method: 'loginWithToken',
                description:
                  '[Recommended] Get access token from Revisium UI and use loginWithToken',
                tokenUrl,
                usage: 'loginWithToken(accessToken)',
              },
              {
                method: 'login',
                description:
                  'Ask user for their username and password, then use login',
                usage: 'login(username, password)',
              },
            ],
            important:
              'DO NOT assume or guess credentials. Always ask the user first.',
          };

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(authOptions, null, 2),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  authenticated: true,
                  user: {
                    id: session.userId,
                    username: session.username,
                    email: session.email,
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
  }

  private getSessionFromContext(
    context: { sessionId?: string } | undefined,
  ): McpSession | null {
    if (!context?.sessionId) return null;
    return this.mcpSession.getSession(context.sessionId);
  }
}
