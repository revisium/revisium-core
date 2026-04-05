import { UriRevisionResolver } from '../uri-revision-resolver';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { CoreEngineApiService } from 'src/core/core-engine-api.service';

describe('UriRevisionResolver', () => {
  let resolver: UriRevisionResolver;
  let projectApi: jest.Mocked<Pick<ProjectApiService, 'getProject'>>;
  let engine: jest.Mocked<
    Pick<
      CoreEngineApiService,
      'getBranch' | 'getDraftRevision' | 'getHeadRevision'
    >
  >;

  beforeEach(() => {
    projectApi = {
      getProject: jest.fn().mockResolvedValue({ id: 'project-id-1' }),
    };
    engine = {
      getBranch: jest.fn().mockResolvedValue({ id: 'branch-id-1' }),
      getDraftRevision: jest.fn().mockResolvedValue({ id: 'draft-rev-id' }),
      getHeadRevision: jest.fn().mockResolvedValue({ id: 'head-rev-id' }),
    };
    resolver = new UriRevisionResolver(
      projectApi as unknown as ProjectApiService,
      engine as unknown as CoreEngineApiService,
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
    expect(projectApi.getProject).toHaveBeenCalledWith({
      organizationId: 'org',
      projectName: 'proj',
    });
    expect(engine.getBranch).toHaveBeenCalledWith({
      projectId: 'project-id-1',
      branchName: 'master',
    });
    expect(engine.getDraftRevision).toHaveBeenCalledWith('branch-id-1');
    expect(engine.getHeadRevision).not.toHaveBeenCalled();
  });

  it('resolves head revision', async () => {
    const result = await resolver.resolve({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
      revision: 'head',
    });

    expect(result).toBe('head-rev-id');
    expect(engine.getHeadRevision).toHaveBeenCalledWith('branch-id-1');
    expect(engine.getDraftRevision).not.toHaveBeenCalled();
  });

  it('passes through specific revisionId without calling any API', async () => {
    const result = await resolver.resolve({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
      revision: 'specific-uuid-123',
    });

    expect(result).toBe('specific-uuid-123');
    expect(projectApi.getProject).not.toHaveBeenCalled();
    expect(engine.getBranch).not.toHaveBeenCalled();
  });

  it('propagates error when project not found', async () => {
    projectApi.getProject.mockRejectedValue(new Error('Project not found'));

    await expect(
      resolver.resolve({
        organizationId: 'org',
        projectName: 'nonexistent',
        branchName: 'master',
        revision: 'draft',
      }),
    ).rejects.toThrow('Project not found');
  });
});
