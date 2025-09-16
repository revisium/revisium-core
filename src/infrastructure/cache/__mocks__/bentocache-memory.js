// Mock implementation of BentoCache memory driver for tests
const mockMemoryDriver = (config) => ({
  type: 'memory',
  config,
});

module.exports = {
  memoryDriver: mockMemoryDriver,
};
