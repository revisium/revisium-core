export function buildMetric(
  current: number,
  limit: number | null = null,
): { current: number; limit: number | null; percentage: number | null } {
  return {
    current,
    limit,
    percentage:
      limit !== null && limit > 0
        ? Math.round((current / limit) * 10000) / 100
        : null,
  };
}
