import { parseBool } from '../parse-bool';

describe('parseBool', () => {
  it('returns false for undefined', () => {
    expect(parseBool(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(parseBool(null as any)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(parseBool('')).toBe(false);
  });

  it('returns true for "1"', () => {
    expect(parseBool('1')).toBe(true);
  });

  it('returns true for "true"', () => {
    expect(parseBool('true')).toBe(true);
  });

  it('returns true for "on"', () => {
    expect(parseBool('on')).toBe(true);
  });

  it('returns true for "yes"', () => {
    expect(parseBool('yes')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(parseBool('TRUE')).toBe(true);
    expect(parseBool('On')).toBe(true);
    expect(parseBool('YeS')).toBe(true);
  });

  it('returns false for unrelated strings', () => {
    expect(parseBool('0')).toBe(false);
    expect(parseBool('false')).toBe(false);
    expect(parseBool('no')).toBe(false);
    expect(parseBool('random')).toBe(false);
  });
});
