export function parseBool(value?: string | null): boolean {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'on', 'yes'].includes(String(value).toLowerCase());
}
