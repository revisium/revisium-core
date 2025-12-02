import {
  Controller,
  Post,
  Get,
  Delete,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { McpServerService } from './mcp-server.service';

@Controller('mcp')
export class McpController {
  private transports: Map<string, StreamableHTTPServerTransport> = new Map();

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
        sessionIdGenerator: () => crypto.randomUUID(),
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

      await this.mcpServer.getServer().connect(transport);
    } else {
      res.status(HttpStatus.BAD_REQUEST).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
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
          message: 'Bad Request: Missing or invalid session ID',
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
          message: 'Bad Request: Missing or invalid session ID',
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
