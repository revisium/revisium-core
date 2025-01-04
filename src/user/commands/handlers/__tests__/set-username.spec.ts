import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { IdService } from 'src/database/id.service';
import { SetUsernameHandler } from '../set-username.handler';
import { SetUsernameCommand } from 'src/user/commands/impl';

describe('SetUsernameHandler', () => {
  it('should throw an error if the username is less than 3 characters', async () => {
    const command = createCommand({ username: 'ab' });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Username must be at least 3 characters',
    );
  });

  it('should throw an error if the current user already has a username', async () => {
    prismaService.user.findFirstOrThrow = createMock({
      id: 'anotherUserId',
      username: 'newUsername',
    });
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Username already exists',
    );
  });

  it('should throw an error if another user already has the same username', async () => {
    prismaService.user.findFirstOrThrow = createMock({ username: null });
    prismaService.user.findUnique = createMock({ id: 'anotherUserId' });
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(
      'The same username already exists',
    );
  });

  it('should throw an error if the same organization already exists', async () => {
    prismaService.user.findFirstOrThrow = createMock({ username: null });
    prismaService.user.findUnique = createMock(null);
    prismaService.organization.findUnique = createMock({
      id: 'newUsername',
    });
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(
      'The same organization already exists',
    );
  });

  it('should set the username if all conditions are met', async () => {
    prismaService.user.findFirstOrThrow = createMock({ username: null });
    prismaService.user.findUnique = createMock(null);
    prismaService.organization.findUnique = createMock(null);
    prismaService.user.update = createMock(true);
    const command = createCommand();

    const result = await handler.execute(command);

    expect(result).toBe(true);
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'userId' },
      data: {
        username: 'newUsername',
        userOrganizations: {
          create: {
            id: 'generatedId',
            organization: {
              create: {
                id: 'newUsername',
              },
            },
            role: {
              connect: {
                id: 'organizationOwner',
              },
            },
          },
        },
      },
    });
  });

  const createCommand = (data: Partial<SetUsernameCommand['data']> = {}) => {
    return new SetUsernameCommand({
      userId: 'userId',
      username: 'newUsername',
      ...data,
    });
  };

  let handler: SetUsernameHandler;
  let prismaService: PrismaService;

  const createMock = <T>(mockResolvedValue: T) =>
    jest.fn().mockResolvedValue(mockResolvedValue);

  beforeEach(async () => {
    const prismaServiceMock = {
      user: {
        findFirstOrThrow: createMock(null),
        findUnique: createMock(null),
        update: createMock(true),
      },
      organization: {
        findUnique: createMock(null),
      },
    };

    const idServiceMock = {
      generate: jest.fn().mockReturnValue('generatedId'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetUsernameHandler,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: IdService, useValue: idServiceMock },
      ],
    }).compile();

    handler = module.get<SetUsernameHandler>(SetUsernameHandler);
    prismaService = module.get<PrismaService>(PrismaService);
  });
});
