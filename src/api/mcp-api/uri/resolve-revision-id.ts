import { parseRevisiumUri } from './parse-revisium-uri';
import { UriRevisionResolver } from './uri-revision-resolver';

export interface RevisionIdInput {
  revisionId?: string;
  uri?: string;
}

export interface BranchParamsInput {
  organizationId?: string;
  projectName?: string;
  branchName?: string;
  uri?: string;
}

export interface BranchParams {
  organizationId: string;
  projectName: string;
  branchName: string;
}

export interface ResolveOptions {
  mutation?: boolean;
}

export async function resolveRevisionId(
  input: RevisionIdInput,
  resolver: UriRevisionResolver,
  options?: ResolveOptions,
): Promise<string> {
  const { revisionId, uri } = input;

  if (revisionId && uri) {
    throw new Error('Provide either "revisionId" or "uri", not both.');
  }

  if (!revisionId && !uri) {
    throw new Error('Either "revisionId" or "uri" is required.');
  }

  if (revisionId) {
    return revisionId;
  }

  const parsed = parseRevisiumUri(uri!);

  if (options?.mutation && parsed.revision !== 'draft') {
    throw new Error(
      `Mutations are only allowed on draft revision. Got "${parsed.revision}" from URI.`,
    );
  }

  return resolver.resolve(parsed);
}

export function resolveBranchParams(input: BranchParamsInput): BranchParams {
  const { organizationId, projectName, branchName, uri } = input;

  if (uri && (organizationId || projectName || branchName)) {
    throw new Error(
      'Provide either "uri" or "organizationId/projectName/branchName", not both.',
    );
  }

  if (uri) {
    const parsed = parseRevisiumUri(uri);
    return {
      organizationId: parsed.organizationId,
      projectName: parsed.projectName,
      branchName: parsed.branchName,
    };
  }

  if (!organizationId || !projectName || !branchName) {
    throw new Error(
      'Either "uri" or all of "organizationId", "projectName", "branchName" are required.',
    );
  }

  return { organizationId, projectName, branchName };
}
