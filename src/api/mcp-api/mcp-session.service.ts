import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtSecretService } from 'src/features/auth/jwt-secret.service';

export interface McpSession {
  userId: string;
  username: string;
  email: string;
  roleId: string | null;
}

@Injectable()
export class McpSessionService {
  private sessions: Map<string, { token: string; session: McpSession }> =
    new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtSecret: JwtSecretService,
  ) {}

  public createSession(
    sessionId: string,
    token: string,
    session: McpSession,
  ): void {
    this.sessions.set(sessionId, { token, session });
  }

  public getSession(sessionId: string): McpSession | null {
    return this.sessions.get(sessionId)?.session ?? null;
  }

  public getToken(sessionId: string): string | null {
    return this.sessions.get(sessionId)?.token ?? null;
  }

  public deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  public verifyToken(token: string): McpSession | null {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.jwtSecret.secret,
      });
      return {
        userId: payload.sub,
        username: payload.username,
        email: payload.email || '',
        roleId: payload.roleId || null,
      };
    } catch {
      return null;
    }
  }
}
