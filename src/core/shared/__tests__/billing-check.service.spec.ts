import { Test } from '@nestjs/testing';
import { BillingCheckService } from '../billing-check.service';
import {
  ILimitsService,
  LIMITS_SERVICE_TOKEN,
  LimitMetric,
} from 'src/features/billing/limits.interface';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { LimitExceededException } from 'src/features/billing/limit-exceeded.exception';

describe('BillingCheckService', () => {
  let service: BillingCheckService;
  let prisma: {
    revision: {
      findUniqueOrThrow: jest.Mock;
    };
  };
  let limitsService: jest.Mocked<ILimitsService>;

  beforeEach(async () => {
    prisma = {
      revision: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          branch: {
            project: {
              id: 'project-1',
              organizationId: 'org-1',
            },
          },
        }),
      },
    };
    limitsService = {
      checkLimit: jest.fn().mockResolvedValue({ allowed: true }),
    };

    const module = await Test.createTestingModule({
      providers: [
        BillingCheckService,
        { provide: PrismaService, useValue: prisma },
        { provide: LIMITS_SERVICE_TOKEN, useValue: limitsService },
      ],
    }).compile();

    service = module.get(BillingCheckService);
  });

  it('adds resolved project context for endpoints-per-project checks', async () => {
    await service.check('revision-1', LimitMetric.ENDPOINTS_PER_PROJECT, 1);

    expect(prisma.revision.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'revision-1' },
      select: {
        branch: {
          select: {
            project: {
              select: { id: true, organizationId: true },
            },
          },
        },
      },
    });
    expect(limitsService.checkLimit).toHaveBeenCalledWith(
      'org-1',
      LimitMetric.ENDPOINTS_PER_PROJECT,
      1,
      {
        revisionId: 'revision-1',
        projectId: 'project-1',
      },
    );
  });

  it('passes through explicit context while preserving resolved project id', async () => {
    await service.check('revision-1', LimitMetric.ENDPOINTS_PER_PROJECT, 2, {
      tableId: 'table-1',
    });

    expect(limitsService.checkLimit).toHaveBeenCalledWith(
      'org-1',
      LimitMetric.ENDPOINTS_PER_PROJECT,
      2,
      {
        revisionId: 'revision-1',
        projectId: 'project-1',
        tableId: 'table-1',
      },
    );
  });

  it('does not inject project context for org-scoped metrics', async () => {
    await service.check('revision-1', LimitMetric.PROJECTS);

    expect(limitsService.checkLimit).toHaveBeenCalledWith(
      'org-1',
      LimitMetric.PROJECTS,
      undefined,
      undefined,
    );
  });

  it('throws LimitExceededException when the limit service denies the action', async () => {
    limitsService.checkLimit.mockResolvedValueOnce({
      allowed: false,
      metric: LimitMetric.ENDPOINTS_PER_PROJECT,
      current: 2,
      limit: 2,
    });

    await expect(
      service.check('revision-1', LimitMetric.ENDPOINTS_PER_PROJECT),
    ).rejects.toBeInstanceOf(LimitExceededException);
  });
});
