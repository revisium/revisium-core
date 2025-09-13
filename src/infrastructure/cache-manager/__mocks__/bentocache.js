// Mock implementation of BentoCache for tests
class MockBentoCache {
  constructor(config) {
    this.config = config;
  }

  namespace(name) {
    return new MockBentoCache(this.config);
  }

  async get(options) {
    return undefined;
  }

  async set(options) {
    return true;
  }

  async delete(options) {
    return true;
  }

  async deleteByTag(options) {
    return true;
  }
}

const mockBentostore = () => ({
  useL1Layer: jest.fn().mockReturnThis(),
  useL2Layer: jest.fn().mockReturnThis(),
});

module.exports = {
  BentoCache: MockBentoCache,
  bentostore: mockBentostore,
};