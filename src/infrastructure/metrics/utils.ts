export function getDurationInSeconds(startAt: [number, number]) {
  const [seconds, nanoseconds] = process.hrtime(startAt);
  return seconds + nanoseconds / 1e9;
}
