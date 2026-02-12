import {
  Controller,
  Post,
  Get,
  Delete,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { McpServerService } from './mcp-server.service';

@ApiExcludeController()
@Controller('mcp')
export class McpController {
  private readonly transports: Map<string, StreamableHTTPServerTransport> =
    new Map();

  constructor(private readonly mcpServer: McpServerService) {}

  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    const preferStreaming =
      req.headers['x-mcp-prefer-sse'] === 'true' ||
      req.headers['x-mcp-prefer-sse'] === '1';

    let transport: StreamableHTTPServerTransport;

    if (sessionId && this.transports.has(sessionId)) {
      transport = this.transports.get(sessionId)!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: !preferStreaming,
        onsessioninitialized: (newSessionId) => {
          this.transports.set(newSessionId, transport);
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) {
          this.transports.delete(sid);
        }
      };

      const server = this.mcpServer.createServer();
      await server.connect(transport);
    } else {
      res.status(HttpStatus.BAD_REQUEST).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: sessionId
            ? 'Session expired or server was restarted. Please reconnect the MCP client (use /mcp command in Claude Code or restart the client).'
            : 'Bad Request: No session ID provided. Send an initialize request first.',
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  }

  @Get()
  async handleGet(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !this.transports.has(sessionId)) {
      res.status(HttpStatus.BAD_REQUEST).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message:
            'Session expired or server was restarted. Please reconnect the MCP client.',
        },
        id: null,
      });
      return;
    }

    const transport = this.transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  }

  @Delete()
  async handleDelete(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !this.transports.has(sessionId)) {
      res.status(HttpStatus.BAD_REQUEST).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message:
            'Session expired or server was restarted. Please reconnect the MCP client.',
        },
        id: null,
      });
      return;
    }

    const transport = this.transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    this.transports.delete(sessionId);
  }
}
