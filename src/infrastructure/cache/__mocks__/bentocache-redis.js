// Mock implementation of BentoCache redis driver for tests
const mockRedisDriver = (config) => ({
  type: 'redis',
  config,
});

module.exports = {
  redisDriver: mockRedisDriver,
};
