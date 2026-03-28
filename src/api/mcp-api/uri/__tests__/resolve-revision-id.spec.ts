import { resolveRevisionId, resolveBranchParams } from '../resolve-revision-id';
import { UriRevisionResolver } from '../uri-revision-resolver';

describe('resolveRevisionId', () => {
  let resolver: jest.Mocked<UriRevisionResolver>;

  beforeEach(() => {
    resolver = {
      resolve: jest.fn().mockResolvedValue('resolved-rev-id'),
    } as unknown as jest.Mocked<UriRevisionResolver>;
  });

  it('returns revisionId directly when provided', async () => {
    const result = await resolveRevisionId(
      { revisionId: 'my-rev-id' },
      resolver,
    );
    expect(result).toBe('my-rev-id');
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it('throws when both revisionId and uri are provided', async () => {
    await expect(
      resolveRevisionId(
        { revisionId: 'my-rev-id', uri: 'org/proj/master' },
        resolver,
      ),
    ).rejects.toThrow('Provide either "revisionId" or "uri", not both');
  });

  it('throws when neither revisionId nor uri is provided', async () => {
    await expect(resolveRevisionId({}, resolver)).rejects.toThrow(
      'Either "revisionId" or "uri" is required',
    );
  });

  it('throws when both are undefined', async () => {
    await expect(
      resolveRevisionId({ revisionId: undefined, uri: undefined }, resolver),
    ).rejects.toThrow('Either "revisionId" or "uri" is required');
  });

  it('resolves draft URI via resolver', async () => {
    const result = await resolveRevisionId(
      { uri: 'org/proj/master' },
      resolver,
    );
    expect(result).toBe('resolved-rev-id');
    expect(resolver.resolve).toHaveBeenCalledWith({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
      revision: 'draft',
    });
  });

  it('resolves head URI via resolver', async () => {
    const result = await resolveRevisionId(
      { uri: 'org/proj/master:head' },
      resolver,
    );
    expect(result).toBe('resolved-rev-id');
    expect(resolver.resolve).toHaveBeenCalledWith({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
      revision: 'head',
    });
  });

  it('resolves specific revisionId URI via resolver', async () => {
    const result = await resolveRevisionId(
      { uri: 'org/proj/master:abc-123' },
      resolver,
    );
    expect(result).toBe('resolved-rev-id');
    expect(resolver.resolve).toHaveBeenCalledWith({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
      revision: 'abc-123',
    });
  });

  describe('mutation mode', () => {
    it('allows mutation with draft URI (default)', async () => {
      const result = await resolveRevisionId(
        { uri: 'org/proj/master' },
        resolver,
        { mutation: true },
      );
      expect(result).toBe('resolved-rev-id');
    });

    it('allows mutation with explicit :draft', async () => {
      const result = await resolveRevisionId(
        { uri: 'org/proj/master:draft' },
        resolver,
        { mutation: true },
      );
      expect(result).toBe('resolved-rev-id');
    });

    it('throws for mutation with :head URI', async () => {
      await expect(
        resolveRevisionId(
          { uri: 'org/proj/master:head' },
          resolver,
          { mutation: true },
        ),
      ).rejects.toThrow('Mutations are only allowed on draft revision');
    });

    it('throws for mutation with specific revisionId URI', async () => {
      await expect(
        resolveRevisionId(
          { uri: 'org/proj/master:abc-123' },
          resolver,
          { mutation: true },
        ),
      ).rejects.toThrow('Mutations are only allowed on draft revision');
    });

    it('allows mutation with revisionId (no URI check)', async () => {
      const result = await resolveRevisionId(
        { revisionId: 'any-rev-id' },
        resolver,
        { mutation: true },
      );
      expect(result).toBe('any-rev-id');
    });
  });
});

describe('resolveBranchParams', () => {
  it('returns params directly when all provided', () => {
    const result = resolveBranchParams({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
    });
    expect(result).toEqual({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
    });
  });

  it('parses short-form URI', () => {
    const result = resolveBranchParams({ uri: 'org/proj/master' });
    expect(result).toEqual({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'master',
    });
  });

  it('parses full URI', () => {
    const result = resolveBranchParams({
      uri: 'revisium://cloud.revisium.io/org/proj/dev',
    });
    expect(result).toEqual({
      organizationId: 'org',
      projectName: 'proj',
      branchName: 'dev',
    });
  });

  it('throws when both uri and params provided', () => {
    expect(() =>
      resolveBranchParams({
        uri: 'org/proj/master',
        organizationId: 'org',
      }),
    ).toThrow('Provide either "uri" or "organizationId/projectName/branchName", not both');
  });

  it('throws when neither provided', () => {
    expect(() => resolveBranchParams({})).toThrow(
      'Either "uri" or all of "organizationId", "projectName", "branchName" are required',
    );
  });

  it('throws when params partially provided', () => {
    expect(() =>
      resolveBranchParams({ organizationId: 'org', projectName: 'proj' }),
    ).toThrow(
      'Either "uri" or all of "organizationId", "projectName", "branchName" are required',
    );
  });
});
