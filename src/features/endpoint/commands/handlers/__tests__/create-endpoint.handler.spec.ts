import { Test } from '@nestjs/testing';
import { EndpointType } from 'src/__generated__/client';
import { BillingCheckService } from 'src/core/shared/billing-check.service';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { CreateEndpointCommand } from '../../impl';
import { CreateEndpointHandler } from '../create-endpoint.handler';

describe('CreateEndpointHandler', () => {
  let handler: CreateEndpointHandler;
  let prisma: {
    endpoint: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let billingCheck: { check: jest.Mock };
  let endpointNotification: { create: jest.Mock };

  beforeEach(async () => {
    prisma = {
      endpoint: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    billingCheck = { check: jest.fn() };
    endpointNotification = { create: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CreateEndpointHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: BillingCheckService, useValue: billingCheck },
        {
          provide: EndpointNotificationService,
          useValue: endpointNotification,
        },
      ],
    }).compile();

    handler = module.get(CreateEndpointHandler);
  });

  it('checks endpoint limits before creating a new endpoint', async () => {
    prisma.endpoint.findFirst.mockResolvedValue(null);
    prisma.endpoint.create.mockResolvedValue({ id: 'endpoint-1' });

    const result = await handler.execute(
      new CreateEndpointCommand({
        revisionId: 'rev-1',
        type: EndpointType.GRAPHQL,
      }),
    );

    expect(billingCheck.check).toHaveBeenCalledWith(
      'rev-1',
      LimitMetric.ENDPOINTS_PER_PROJECT,
    );
    expect(prisma.endpoint.create).toHaveBeenCalled();
    expect(endpointNotification.create).toHaveBeenCalledWith('endpoint-1');
    expect(result).toBe('endpoint-1');
  });

  it('checks endpoint limits before restoring a deleted endpoint', async () => {
    prisma.endpoint.findFirst.mockResolvedValue({
      id: 'endpoint-2',
      isDeleted: true,
    });
    prisma.endpoint.update.mockResolvedValue({ id: 'endpoint-2' });

    const result = await handler.execute(
      new CreateEndpointCommand({
        revisionId: 'rev-1',
        type: EndpointType.REST_API,
      }),
    );

    expect(billingCheck.check).toHaveBeenCalledWith(
      'rev-1',
      LimitMetric.ENDPOINTS_PER_PROJECT,
    );
    expect(prisma.endpoint.update).toHaveBeenCalledWith({
      where: { id: 'endpoint-2' },
      data: { isDeleted: false, createdAt: expect.any(Date) },
    });
    expect(endpointNotification.create).toHaveBeenCalledWith('endpoint-2');
    expect(result).toBe('endpoint-2');
  });
});
