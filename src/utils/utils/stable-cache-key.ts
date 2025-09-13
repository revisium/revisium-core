import { createHash } from 'crypto';

export type HashAlg = 'sha256' | 'sha1' | 'md5';
export type HashEncoding = 'base64url' | 'hex';

export interface MakeCacheKeyOptions {
  version?: string | number;
  prefix?: string;
  hashAlgorithm?: HashAlg;
  encoding?: HashEncoding;
}

export function canonicalize(value: unknown): unknown {
  if (value && typeof (value as any).toJSON === 'function') {
    return canonicalize((value as any).toJSON());
  }

  if (value === null) return null;

  const t = typeof value;
  if (t !== 'object') {
    return value as any;
  }

  if (Array.isArray(value)) {
    return (value as unknown[]).map(canonicalize);
  }

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort((a, b) => a.localeCompare(b))) {
    out[key] = canonicalize(obj[key]);
  }
  return out;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function hashString(input: string, alg: HashAlg, enc: HashEncoding): string {
  return createHash(alg).update(input).digest(enc);
}

export function makeCacheKey(
  value: unknown,
  options: MakeCacheKeyOptions = {},
): string {
  const {
    version = 1,
    prefix,
    hashAlgorithm = 'sha256',
    encoding = 'base64url',
  } = options;

  const payload = { v: version, data: canonicalize(value) };
  const json = JSON.stringify(payload);
  const h = hashString(json, hashAlgorithm, encoding);
  return prefix ? `${prefix}:${h}` : h;
}

export function makeCacheKeyFromArgs(
  args: unknown[],
  options: MakeCacheKeyOptions = {},
): string {
  return makeCacheKey({ __tuple__: args }, options);
}
