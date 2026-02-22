import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtSecretService } from 'src/features/auth/jwt-secret.service';
import { NoAuthService } from 'src/features/auth/no-auth.service';
import { OAuthTokenService } from 'src/features/oauth/oauth-token.service';
import { McpAuthService } from '../mcp-auth.service';

describe('McpAuthService', () => {
  let service: McpAuthService;
  let noAuth: {
    enabled: boolean;
    adminUser: { userId: string; email: string };
  };
  let jwtService: { verify: jest.Mock };
  let jwtSecret: { secret: string };
  let oauthToken: { validateAccessToken: jest.Mock };

  beforeEach(async () => {
    noAuth = {
      enabled: false,
      adminUser: { userId: 'admin', email: 'admin@test.com' },
    };
    jwtService = { verify: jest.fn() };
    jwtSecret = { secret: 'test-secret' };
    oauthToken = { validateAccessToken: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpAuthService,
        { provide: NoAuthService, useValue: noAuth },
        { provide: JwtService, useValue: jwtService },
        { provide: JwtSecretService, useValue: jwtSecret },
        { provide: OAuthTokenService, useValue: oauthToken },
      ],
    }).compile();

    service = module.get(McpAuthService);
  });

  const createRequest = (authorization?: string) =>
    ({
      headers: authorization ? { authorization } : {},
    }) as any;

  describe('NO_AUTH mode', () => {
    it('returns admin context when noAuth enabled', async () => {
      noAuth.enabled = true;

      const result = await service.extractUserContext(createRequest());

      expect(result).toEqual({
        userId: 'admin',
        username: 'admin',
        email: 'admin@test.com',
        roleId: 'systemAdmin',
      });
    });
  });

  describe('missing authorization', () => {
    it('throws when no Authorization header', async () => {
      await expect(service.extractUserContext(createRequest())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws when Authorization is not Bearer', async () => {
      await expect(
        service.extractUserContext(createRequest('Basic abc')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('JWT validation', () => {
    it('validates JWT token (3-dot format)', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        roleId: 'editor',
      });

      const result = await service.extractUserContext(
        createRequest('Bearer header.payload.signature'),
      );

      expect(result).toEqual({
        userId: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        roleId: 'editor',
      });
      expect(jwtService.verify).toHaveBeenCalledWith(
        'header.payload.signature',
        { secret: 'test-secret' },
      );
    });

    it('returns empty strings for null username/email in JWT', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      const result = await service.extractUserContext(
        createRequest('Bearer a.b.c'),
      );

      expect(result.username).toBe('');
      expect(result.email).toBe('');
      expect(result.roleId).toBeNull();
    });

    it('throws on invalid JWT', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(
        service.extractUserContext(createRequest('Bearer a.b.c')),
      ).rejects.toThrow('Invalid or expired JWT');
    });
  });

  describe('OAuth token validation', () => {
    it('validates oat_ prefixed token', async () => {
      oauthToken.validateAccessToken.mockResolvedValue({
        userId: 'user-2',
        username: 'oauthuser',
        email: 'oauth@test.com',
        roleId: null,
      });

      const result = await service.extractUserContext(
        createRequest('Bearer oat_abc123'),
      );

      expect(result).toEqual({
        userId: 'user-2',
        username: 'oauthuser',
        email: 'oauth@test.com',
        roleId: null,
      });
      expect(oauthToken.validateAccessToken).toHaveBeenCalledWith('oat_abc123');
    });
  });

  describe('unrecognized token', () => {
    it('throws for non-JWT non-oat token', async () => {
      await expect(
        service.extractUserContext(createRequest('Bearer random_token')),
      ).rejects.toThrow('Unrecognized token format');
    });
  });
});
