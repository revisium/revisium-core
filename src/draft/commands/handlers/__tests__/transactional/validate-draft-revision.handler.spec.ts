import { Prisma } from '@prisma/client';
import { createMocks } from 'src/__tests__/utils/createMocks';
import { ResolveDraftRevisionHandler } from 'src/draft/commands/handlers/transactional/resolve-draft-revision.handler';

xdescribe('ValidateDraftRevisionHandler', () => {
  let mocks: ReturnType<typeof createMocks>;
  let revisionId: string;

  beforeEach(() => {
    mocks = createMocks();

    revisionId = 'revisionId';
  });

  describe('Input validations', () => {
    it('should reject if the specified revision does not exist', async () => {
      revisionId = 'unreal';

      await expect(callHandler()).rejects.toThrow('Revision not found');
    });
  });

  describe('Database interactions', () => {
    it('should reject if the revision is not a draft revision', async () => {
      mockGetRevision({ isDraft: false });

      await expect(callHandler()).rejects.toThrow(
        'The revision is not a draft',
      );
    });

    it('should return true', async () => {
      mockGetRevision({ isDraft: true });

      await expect(callHandler()).resolves.toBe(true);

      checkFindRevision();
    });
  });

  // Mock Functions for simulating database and service interactions
  function mockGetRevision(
    value: Partial<Prisma.RevisionGetPayload<Prisma.RevisionDefaultArgs>>,
  ) {
    const { prisma } = mocks;

    prisma.revision.findUnique.mockResolvedValue(
      value as Prisma.RevisionGetPayload<Prisma.RevisionDefaultArgs>,
    );
  }

  function checkFindRevision() {
    const { prisma } = mocks;
    expect(prisma.revision.findUnique).nthCalledWith(1, {
      where: { id: revisionId },
      select: { isDraft: true },
    });
  }

  async function callHandler() {
    const { transactionPrisma } = mocks;

    // @ts-expect-error
    const handler = new ResolveDraftRevisionHandler(transactionPrisma);

    return handler.execute({ revisionId });
  }
});
