import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AuthApiService } from 'src/features/auth/commands/auth-api.service';
import { McpSession, McpSessionService } from '../mcp-session.service';
import { McpContext, McpToolRegistrar } from '../types';

export class AuthTools implements McpToolRegistrar {
  constructor(
    private readonly mcpSession: McpSessionService,
    private readonly authApi: AuthApiService,
  ) {}

  register(
    server: McpServer,
    _requireAuth: (context: McpContext) => McpSession,
  ): void {
    server.tool(
      'login',
      'Authenticate with Revisium API using username and password',
      {
        username: z.string().describe('Username'),
        password: z.string().describe('Password'),
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

    server.tool(
      'me',
      'Get current authenticated user information',
      {},
      async (_args, context) => {
        const session = this.getSessionFromContext(context);
        if (!session) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ authenticated: false }, null, 2),
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
