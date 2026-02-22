import {
  Controller,
  Post,
  Get,
  Delete,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { version } from '../../../package.json';
import { McpServerService } from './mcp-server.service';
import { McpAuthService } from './mcp-auth.service';

@ApiExcludeController()
@Controller('mcp')
export class McpController {
  constructor(
    private readonly mcpServer: McpServerService,
    private readonly mcpAuth: McpAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const server = new McpServer(
      { name: 'revisium', version },
      { instructions: this.mcpServer.getInstructions() },
    );

    try {
      const userContext = await this.mcpAuth.extractUserContext(req);
      this.mcpServer.registerTools(server, userContext);
      this.mcpServer.registerResources(server);
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      if (!res.headersSent) {
        if (error instanceof UnauthorizedException) {
          const publicUrl =
            this.configService.get<string>('PUBLIC_URL') ||
            `${req.protocol}://${req.get('host')}`;
          res
            .status(401)
            .setHeader(
              'WWW-Authenticate',
              `Bearer resource_metadata="${publicUrl}/.well-known/oauth-protected-resource"`,
            )
            .json({
              jsonrpc: '2.0',
              error: { code: -32001, message: 'Unauthorized' },
              id: null,
            });
        } else {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal error' },
            id: null,
          });
        }
      }
    } finally {
      await server.close().catch(() => {});
      await transport.close().catch(() => {});
    }
  }

  @Get()
  handleGet(@Res() res: Response) {
    res
      .status(405)
      .setHeader('Allow', 'POST')
      .json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'SSE not supported. Use stateless POST requests.',
        },
        id: null,
      });
  }

  @Delete()
  handleDelete(@Res() res: Response) {
    res
      .status(405)
      .setHeader('Allow', 'POST')
      .json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Session management not supported in stateless mode.',
        },
        id: null,
      });
  }
}
