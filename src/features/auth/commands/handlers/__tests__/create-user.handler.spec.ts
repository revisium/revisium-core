import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { AuthService } from 'src/features/auth/auth.service';
import { IdService } from 'src/infrastructure/database/id.service';
import { CreateUserHandler } from 'src/features/auth/commands/handlers/create-user.handler';
import { CreateUserCommand } from 'src/features/auth/commands/impl';
import { UserRole, UserSystemRoles } from 'src/features/auth/consts';

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let prismaService: PrismaService;
  let authService: AuthService;
  let idService: IdService;

  const createMock = <T>(mockResolvedValue: T) =>
    jest.fn().mockResolvedValue(mockResolvedValue);

  const createCommand = (data: Partial<CreateUserCommand['data']> = {}) => {
    return new CreateUserCommand({
      email: 'test@example.com',
      password: 'password123',
      roleId: UserSystemRoles.systemUser,
      isEmailConfirmed: true,
      ...data,
    });
  };

  beforeEach(async () => {
    const prismaServiceMock = {
      user: {
        findFirst: createMock(null),
        create: createMock({ id: 'userId' }),
      },
      organization: {
        findUnique: createMock(null),
      },
    };

    const authServiceMock = {
      hashPassword: jest.fn().mockResolvedValue('hashedPassword'),
    };

    const idServiceMock = {
      generate: jest.fn().mockReturnValue('generatedId'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserHandler,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: IdService, useValue: idServiceMock },
      ],
    }).compile();

    handler = module.get<CreateUserHandler>(CreateUserHandler);
    prismaService = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
    idService = module.get<IdService>(IdService);
  });

  describe('successful user creation', () => {
    it('should create user and return userId', async () => {
      const command = createCommand();

      const result = await handler.execute(command);

      expect(result).toBe('generatedId');
      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it('should create user with all provided fields', async () => {
      const command = createCommand({
        email: 'user@example.com',
        password: 'securepass123',
        isEmailConfirmed: false,
        emailCode: 'ABC123',
      });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'generatedId',
          email: 'user@example.com',
          isEmailConfirmed: false,
          emailCode: 'ABC123',
          password: 'hashedPassword',
          role: { connect: { id: UserSystemRoles.systemUser } },
        }),
      });
    });

    it('should create user with organization when username is provided', async () => {
      const command = createCommand({ username: 'testuser' });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'testuser',
          userOrganizations: {
            create: {
              id: 'generatedId',
              organization: {
                create: {
                  id: 'testuser',
                  createdId: 'generatedId',
                },
              },
              role: {
                connect: { id: UserRole.organizationOwner },
              },
            },
          },
        }),
      });
    });

    it('should create user without organization when username is not provided', async () => {
      const command = createCommand({ username: undefined });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({
          userOrganizations: expect.anything(),
        }),
      });
    });

    it('should generate unique IDs for user and organization', async () => {
      let callCount = 0;
      (idService.generate as jest.Mock).mockImplementation(() => {
        callCount++;
        return `id-${callCount}`;
      });
      const command = createCommand({ username: 'testuser' });

      await handler.execute(command);

      expect(idService.generate).toHaveBeenCalledTimes(3);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'id-1',
          userOrganizations: {
            create: expect.objectContaining({
              id: 'id-2',
              organization: {
                create: expect.objectContaining({
                  createdId: 'id-3',
                }),
              },
            }),
          },
        }),
      });
    });
  });

  describe('password handling', () => {
    it('should hash password when provided', async () => {
      const command = createCommand({ password: 'password123' });

      await handler.execute(command);

      expect(authService.hashPassword).toHaveBeenCalledWith('password123');
      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'hashedPassword',
          }),
        }),
      );
    });

    it('should store empty string when password is empty (OAuth user)', async () => {
      const command = createCommand({ password: '' });

      await handler.execute(command);

      expect(authService.hashPassword).not.toHaveBeenCalled();
      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: '',
          }),
        }),
      );
    });

    it('should throw error when password is too short (less than 8 characters)', async () => {
      const command = createCommand({ password: 'short' });

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        'Password must be at least 8 characters',
      );
    });

    it('should throw error when password is exactly 7 characters', async () => {
      const command = createCommand({ password: '1234567' });

      await expect(handler.execute(command)).rejects.toThrow(
        'Password must be at least 8 characters',
      );
    });

    it('should accept password with exactly 8 characters', async () => {
      const command = createCommand({ password: '12345678' });

      await handler.execute(command);

      expect(authService.hashPassword).toHaveBeenCalledWith('12345678');
    });

    it('should accept long passwords', async () => {
      const longPassword = 'a'.repeat(100);
      const command = createCommand({ password: longPassword });

      await handler.execute(command);

      expect(authService.hashPassword).toHaveBeenCalledWith(longPassword);
    });
  });

  describe('role validation', () => {
    it('should accept systemUser role', async () => {
      const command = createCommand({ roleId: UserSystemRoles.systemUser });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: { connect: { id: UserSystemRoles.systemUser } },
        }),
      });
    });

    it('should accept systemAdmin role', async () => {
      const command = createCommand({ roleId: UserSystemRoles.systemAdmin });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: { connect: { id: UserSystemRoles.systemAdmin } },
        }),
      });
    });

    it('should accept systemFullApiRead role', async () => {
      const command = createCommand({
        roleId: UserSystemRoles.systemFullApiRead,
      });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: { connect: { id: UserSystemRoles.systemFullApiRead } },
        }),
      });
    });

    it('should throw error for invalid system role', async () => {
      const command = createCommand({
        roleId: 'invalidRole' as UserSystemRoles,
      });

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        'Invalid SystemRole',
      );
    });

    it('should throw error for organization role (not a system role)', async () => {
      const command = createCommand({
        roleId: UserRole.organizationOwner as unknown as UserSystemRoles,
      });

      await expect(handler.execute(command)).rejects.toThrow(
        'Invalid SystemRole',
      );
    });

    it('should throw error for project role (not a system role)', async () => {
      const command = createCommand({
        roleId: UserRole.developer as unknown as UserSystemRoles,
      });

      await expect(handler.execute(command)).rejects.toThrow(
        'Invalid SystemRole',
      );
    });
  });

  describe('username validation', () => {
    it('should validate username format', async () => {
      const command = createCommand({ username: 'invalid username!' });

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept valid username with lowercase letters', async () => {
      const command = createCommand({ username: 'validuser' });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it('should accept valid username with numbers', async () => {
      const command = createCommand({ username: 'user123' });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it('should accept valid username with hyphens', async () => {
      const command = createCommand({ username: 'valid-user' });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it('should skip username validation when username is not provided', async () => {
      const command = createCommand({ username: undefined });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalled();
    });
  });

  describe('duplicate user validation', () => {
    it('should throw error when user with same email exists', async () => {
      prismaService.user.findFirst = createMock({ id: 'existingUserId' });
      const command = createCommand({ email: 'existing@example.com' });

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        'User already exists',
      );
    });

    it('should throw error when user with same username exists', async () => {
      prismaService.user.findFirst = createMock({ id: 'existingUserId' });
      const command = createCommand({ username: 'existinguser' });

      await expect(handler.execute(command)).rejects.toThrow(
        'User already exists',
      );
    });

    it('should check for user by email OR username', async () => {
      const command = createCommand({
        email: 'test@example.com',
        username: 'testuser',
      });

      await handler.execute(command);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'test@example.com' }, { username: 'testuser' }],
        },
      });
    });
  });

  describe('organization validation', () => {
    it('should throw error when organization with username already exists', async () => {
      prismaService.organization.findUnique = createMock({ id: 'testuser' });
      const command = createCommand({ username: 'testuser' });

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        'Organization with name=testuser already exists',
      );
    });

    it('should skip organization check when username is not provided', async () => {
      const command = createCommand({ username: undefined });

      await handler.execute(command);

      expect(prismaService.organization.findUnique).not.toHaveBeenCalled();
    });

    it('should check organization existence by username', async () => {
      const command = createCommand({ username: 'newuser' });

      await handler.execute(command);

      expect(prismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'newuser' },
        select: { id: true },
      });
    });
  });

  describe('validation order', () => {
    it('should validate username before checking user existence', async () => {
      const command = createCommand({ username: 'invalid username!' });

      await expect(handler.execute(command)).rejects.toThrow();

      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
    });

    it('should validate role before checking user existence', async () => {
      const command = createCommand({
        roleId: 'invalidRole' as UserSystemRoles,
      });

      await expect(handler.execute(command)).rejects.toThrow(
        'Invalid SystemRole',
      );

      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
    });

    it('should validate password before checking user existence', async () => {
      const command = createCommand({ password: 'short' });

      await expect(handler.execute(command)).rejects.toThrow(
        'Password must be at least 8 characters',
      );

      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
    });

    it('should check user existence before organization existence', async () => {
      prismaService.user.findFirst = createMock({ id: 'existingUserId' });
      const command = createCommand({ username: 'testuser' });

      await expect(handler.execute(command)).rejects.toThrow(
        'User already exists',
      );

      expect(prismaService.organization.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle user creation with minimal data', async () => {
      const command = createCommand({
        email: 'minimal@example.com',
        password: '',
        roleId: UserSystemRoles.systemUser,
        isEmailConfirmed: false,
      });

      const result = await handler.execute(command);

      expect(result).toBe('generatedId');
    });

    it('should handle emailCode field', async () => {
      const command = createCommand({ emailCode: 'VERIFY123' });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emailCode: 'VERIFY123',
        }),
      });
    });

    it('should handle undefined emailCode', async () => {
      const command = createCommand({ emailCode: undefined });

      await handler.execute(command);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emailCode: undefined,
        }),
      });
    });
  });
});
