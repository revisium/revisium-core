export interface ParsedUri {
  organizationId: string;
  projectName: string;
  branchName: string;
  revision: string;
}

export function parseRevisiumUri(uri: string): ParsedUri {
  if (!uri) {
    throw new Error('URI must not be empty');
  }

  let path = uri;

  // Strip revisium:// scheme and host
  if (path.startsWith('revisium://')) {
    path = path.slice('revisium://'.length);

    // Strip user:pass@ if present
    const atIndex = path.indexOf('@');
    const slashIndex = path.indexOf('/');
    if (atIndex !== -1 && (slashIndex === -1 || atIndex < slashIndex)) {
      path = path.slice(atIndex + 1);
    }

    // Strip host[:port] (everything before first /)
    const hostEnd = path.indexOf('/');
    if (hostEnd === -1) {
      throw new Error(
        `Invalid Revisium URI: missing path after host. Expected: revisium://host/org/project/branch[:revision]`,
      );
    }
    path = path.slice(hostEnd + 1);
  }

  // Strip query parameters
  const queryIndex = path.indexOf('?');
  if (queryIndex !== -1) {
    path = path.slice(0, queryIndex);
  }

  // Split into org/project/branch[:revision]
  const segments = path.split('/');
  if (segments.length !== 3) {
    throw new Error(
      `Invalid Revisium URI: expected 3 path segments (org/project/branch[:revision]), got ${segments.length}. URI: "${uri}"`,
    );
  }

  const [organizationId, projectName, branchWithRevision] = segments;

  if (!organizationId) {
    throw new Error(`Invalid Revisium URI: organization must not be empty`);
  }
  if (!projectName) {
    throw new Error(`Invalid Revisium URI: project must not be empty`);
  }
  if (!branchWithRevision) {
    throw new Error(`Invalid Revisium URI: branch must not be empty`);
  }

  // Split branch:revision
  const colonIndex = branchWithRevision.indexOf(':');
  let branchName: string;
  let revision: string;

  if (colonIndex === -1) {
    branchName = branchWithRevision;
    revision = 'draft';
  } else {
    branchName = branchWithRevision.slice(0, colonIndex);
    revision = branchWithRevision.slice(colonIndex + 1) || 'draft';
  }

  if (!branchName) {
    throw new Error(`Invalid Revisium URI: branch must not be empty`);
  }

  return { organizationId, projectName, branchName, revision };
}
