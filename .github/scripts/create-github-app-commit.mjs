import fs from 'node:fs';

const apiVersion = '2022-11-28';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function appendOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function github(method, path, body) {
  const repo = requiredEnv('GITHUB_REPOSITORY');
  const token = requiredEnv('GH_TOKEN');
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': apiVersion,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

function commitFiles() {
  const files = requiredEnv('COMMIT_FILES')
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);

  if (files.length === 0) {
    throw new Error('COMMIT_FILES must contain at least one path');
  }

  return files.map((path) => ({
    path,
    mode: '100644',
    type: 'blob',
    content: fs.readFileSync(path, 'utf8'),
  }));
}

const baseSha = requiredEnv('BASE_SHA');
const targetBranch = requiredEnv('TARGET_BRANCH');
const refMode = requiredEnv('REF_MODE');
const message = requiredEnv('COMMIT_MESSAGE');

if (!['create', 'update'].includes(refMode)) {
  throw new Error(`REF_MODE must be create or update, got ${refMode}`);
}

const baseCommit = await github('GET', `/git/commits/${baseSha}`);
const tree = await github('POST', '/git/trees', {
  base_tree: baseCommit.tree.sha,
  tree: commitFiles(),
});

const commit = await github('POST', '/git/commits', {
  message,
  tree: tree.sha,
  parents: [baseSha],
});

if (!commit.verification?.verified) {
  const reason = commit.verification?.reason || 'unknown';
  throw new Error(`GitHub did not verify the release bot commit (${reason})`);
}

const ref = `refs/heads/${targetBranch}`;
if (refMode === 'create') {
  await github('POST', '/git/refs', {
    ref,
    sha: commit.sha,
  });
} else {
  await github('PATCH', `/git/refs/heads/${targetBranch}`, {
    sha: commit.sha,
    force: false,
  });
}

appendOutput('commit_sha', commit.sha);
appendOutput('verification_reason', commit.verification.reason || '');

console.log(`Created verified GitHub App commit ${commit.sha} on ${ref}`);
console.log(`Verification reason: ${commit.verification.reason || 'unknown'}`);
console.log(optionalEnv('COMMIT_SUMMARY'));
