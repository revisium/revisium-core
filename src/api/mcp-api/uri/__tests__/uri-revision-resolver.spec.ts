import { UriRevisionResolver } from '../uri-revision-resolver';
import { BranchApiService } from 'src/features/branch/branch-api.service';

describe('UriRevisionResolver', () => {
  let resolver: UriRevisionResolver;
  let branchApi: jest.Mocked<
    Pick<BranchApiService, 'getBranch' | 'getDraftRevision' | 'getHeadRevision'>
  >;

  beforeEach(() => {
    branchApi = {
      getBranch: jest.fn().mockResolvedValue({ id: 'branch-id-1' }),
      getDraftRevision: jest.fn().mockResolvedValue({ id: 'draft-rev-id' }),
      getHeadRevision: jest.fn().mockResolvedValue({ id: 'head-rev-id' }),
    };
    resolver = new UriRevisionResolver(
      branchApi as unknown as BranchApiService,
    );
  });

  it('resolves draft revision', async () => {
    const result = await resolver.resolve({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
      revision: 'draft',
    });

    expect(result).toBe('draft-rev-id');
    expect(branchApi.getBranch).toHaveBeenCalledWith({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
    });
    expect(branchApi.getDraftRevision).toHaveBeenCalledWith('branch-id-1');
    expect(branchApi.getHeadRevision).not.toHaveBeenCalled();
  });

  it('resolves head revision', async () => {
    const result = await resolver.resolve({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
      revision: 'head',
    });

    expect(result).toBe('head-rev-id');
    expect(branchApi.getBranch).toHaveBeenCalledWith({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
    });
    expect(branchApi.getHeadRevision).toHaveBeenCalledWith('branch-id-1');
    expect(branchApi.getDraftRevision).not.toHaveBeenCalled();
  });

  it('passes through specific revisionId without calling branch API', async () => {
    const result = await resolver.resolve({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
      revision: 'specific-uuid-123',
    });

    expect(result).toBe('specific-uuid-123');
    expect(branchApi.getBranch).not.toHaveBeenCalled();
    expect(branchApi.getDraftRevision).not.toHaveBeenCalled();
    expect(branchApi.getHeadRevision).not.toHaveBeenCalled();
  });

  it('propagates error when branch not found', async () => {
    branchApi.getBranch.mockRejectedValue(new Error('Branch not found'));

    await expect(
      resolver.resolve({
        organizationId: 'org',
        projectName: 'proj',
        branchName: 'nonexistent',
        revision: 'draft',
      }),
    ).rejects.toThrow('Branch not found');
  });
});
