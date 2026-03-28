import { parseRevisiumUri } from '../parse-revisium-uri';

describe('parseRevisiumUri', () => {
  describe('short form (org/project/branch)', () => {
    it('parses basic short form and defaults revision to draft', () => {
      const result = parseRevisiumUri('my-org/my-project/master');
      expect(result).toEqual({
        organizationId: 'my-org',
        projectName: 'my-project',
        branchName: 'master',
        revision: 'draft',
      });
    });

    it('parses with explicit :draft revision', () => {
      const result = parseRevisiumUri('my-org/my-project/master:draft');
      expect(result).toEqual({
        organizationId: 'my-org',
        projectName: 'my-project',
        branchName: 'master',
        revision: 'draft',
      });
    });

    it('parses with :head revision', () => {
      const result = parseRevisiumUri('my-org/my-project/master:head');
      expect(result).toEqual({
        organizationId: 'my-org',
        projectName: 'my-project',
        branchName: 'master',
        revision: 'head',
      });
    });

    it('parses with specific revisionId', () => {
      const result = parseRevisiumUri('my-org/my-project/master:abc-123-def');
      expect(result).toEqual({
        organizationId: 'my-org',
        projectName: 'my-project',
        branchName: 'master',
        revision: 'abc-123-def',
      });
    });
  });

  describe('full URI (revisium://host/org/project/branch)', () => {
    it('parses full URI and strips scheme + host', () => {
      const result = parseRevisiumUri(
        'revisium://cloud.revisium.io/my-org/my-project/master',
      );
      expect(result).toEqual({
        organizationId: 'my-org',
        projectName: 'my-project',
        branchName: 'master',
        revision: 'draft',
      });
    });

    it('parses full URI with :head revision', () => {
      const result = parseRevisiumUri(
        'revisium://cloud.revisium.io/my-org/my-project/master:head',
      );
      expect(result).toEqual({
        organizationId: 'my-org',
        projectName: 'my-project',
        branchName: 'master',
        revision: 'head',
      });
    });

    it('parses full URI with auth (user:pass@host)', () => {
      const result = parseRevisiumUri(
        'revisium://user:pass@cloud.revisium.io/my-org/my-project/main',
      );
      expect(result).toEqual({
        organizationId: 'my-org',
        projectName: 'my-project',
        branchName: 'main',
        revision: 'draft',
      });
    });

    it('parses full URI with port', () => {
      const result = parseRevisiumUri(
        'revisium://localhost:8080/my-org/my-project/dev',
      );
      expect(result).toEqual({
        organizationId: 'my-org',
        projectName: 'my-project',
        branchName: 'dev',
        revision: 'draft',
      });
    });

    it('parses full URI with auth and port', () => {
      const result = parseRevisiumUri(
        'revisium://admin:secret@myhost:3000/org1/proj1/feature:head',
      );
      expect(result).toEqual({
        organizationId: 'org1',
        projectName: 'proj1',
        branchName: 'feature',
        revision: 'head',
      });
    });

    it('strips query parameters (token, apikey)', () => {
      const result = parseRevisiumUri(
        'revisium://cloud.revisium.io/my-org/my-project/master?token=abc123',
      );
      expect(result).toEqual({
        organizationId: 'my-org',
        projectName: 'my-project',
        branchName: 'master',
        revision: 'draft',
      });
    });
  });

  describe('error cases', () => {
    it('throws on empty string', () => {
      expect(() => parseRevisiumUri('')).toThrow();
    });

    it('throws on too few segments (org only)', () => {
      expect(() => parseRevisiumUri('my-org')).toThrow();
    });

    it('throws on too few segments (org/project only)', () => {
      expect(() => parseRevisiumUri('my-org/my-project')).toThrow();
    });

    it('throws on empty organization', () => {
      expect(() => parseRevisiumUri('/my-project/master')).toThrow();
    });

    it('throws on empty project', () => {
      expect(() => parseRevisiumUri('my-org//master')).toThrow();
    });

    it('throws on empty branch', () => {
      expect(() => parseRevisiumUri('my-org/my-project/')).toThrow();
    });

    it('throws on empty branch with revision', () => {
      expect(() => parseRevisiumUri('my-org/my-project/:head')).toThrow();
    });
  });
});
