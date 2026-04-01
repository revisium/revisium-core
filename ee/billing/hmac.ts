import * as crypto from 'node:crypto';

export function signRequest(
  secret: string,
  body: string,
): { signature: string; timestamp: string } {
  const timestamp = Date.now().toString();
  const payload = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return { signature, timestamp };
}

export function verifyRequest(
  secret: string,
  body: string,
  signature: string,
  timestamp: string,
  maxAgeMs: number = 300_000,
): boolean {
  const age = Date.now() - Number.parseInt(timestamp, 10);
  if (age > maxAgeMs || age < 0) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');

  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
