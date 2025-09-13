import {
  BentoCacheFacade,
  createNoopBentoCacheFacade,
} from '../services/bentocache.facade';

describe('BentoCacheFacade', () => {
  describe('noop mode', () => {
    it('createNoopBentoCacheFacade creates facade with null bento', () => {
      const facade = createNoopBentoCacheFacade();
      expect(facade).toBeInstanceOf(BentoCacheFacade);
    });

    it('noop facade get returns undefined', async () => {
      const facade = createNoopBentoCacheFacade();
      const result = await facade.get('any-key');
      expect(result).toBeUndefined();
    });

    it('noop facade set does nothing', async () => {
      const facade = createNoopBentoCacheFacade();
      await expect(facade.set('key', 'value')).resolves.toBeUndefined();
    });

    it('noop facade del does nothing', async () => {
      const facade = createNoopBentoCacheFacade();
      await expect(facade.del('key')).resolves.toBeUndefined();
    });

    it('noop facade delByTags does nothing', async () => {
      const facade = createNoopBentoCacheFacade();
      await expect(facade.delByTags(['tag'])).resolves.toBeUndefined();
    });

    it('noop facade supports namespace parameters', async () => {
      const facade = createNoopBentoCacheFacade();

      const result = await facade.get('key', 'namespace');
      expect(result).toBeUndefined();

      await expect(
        facade.set('key', 'value', { namespace: 'ns' }),
      ).resolves.toBeUndefined();
      await expect(facade.del('key', 'namespace')).resolves.toBeUndefined();
      await expect(
        facade.delByTags(['tag'], 'namespace'),
      ).resolves.toBeUndefined();
    });
  });

  describe('with mocked BentoCache', () => {
    let mockBento: any;
    let facade: BentoCacheFacade;

    beforeEach(() => {
      mockBento = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        deleteByTag: jest.fn(),
        namespace: jest.fn(),
      };
      facade = new BentoCacheFacade(mockBento);
    });

    it('get calls bentocache get with correct format', async () => {
      mockBento.get.mockResolvedValue('cached-value');

      const result = await facade.get('test-key');

      expect(mockBento.get).toHaveBeenCalledWith({ key: 'test-key' });
      expect(result).toBe('cached-value');
    });

    it('set calls bentocache set with correct format', async () => {
      await facade.set('test-key', 'test-value', {
        ttlSec: 60,
        tags: ['tag1', 'tag2'],
      });

      expect(mockBento.set).toHaveBeenCalledWith({
        key: 'test-key',
        value: 'test-value',
        ttl: 60000, // converted to milliseconds
        tags: ['tag1', 'tag2'],
      });
    });

    it('delete calls bentocache delete with correct format', async () => {
      await facade.del('test-key');

      expect(mockBento.delete).toHaveBeenCalledWith({ key: 'test-key' });
    });

    it('delByTags calls bentocache deleteByTag for each tag', async () => {
      await facade.delByTags(['tag1', 'tag2']);

      expect(mockBento.deleteByTag).toHaveBeenCalledTimes(2);
      expect(mockBento.deleteByTag).toHaveBeenCalledWith({ tags: ['tag1'] });
      expect(mockBento.deleteByTag).toHaveBeenCalledWith({ tags: ['tag2'] });
    });

    it('namespace support works correctly', async () => {
      const mockNamespaced = {
        get: jest.fn().mockResolvedValue('ns-value'),
        set: jest.fn(),
        delete: jest.fn(),
        deleteByTag: jest.fn(),
      };
      mockBento.namespace.mockReturnValue(mockNamespaced);

      // Test get with namespace
      const result = await facade.get('key', 'test-ns');
      expect(mockBento.namespace).toHaveBeenCalledWith('test-ns');
      expect(mockNamespaced.get).toHaveBeenCalledWith({ key: 'key' });
      expect(result).toBe('ns-value');

      // Test set with namespace
      await facade.set('key', 'value', { namespace: 'test-ns' });
      expect(mockNamespaced.set).toHaveBeenCalledWith({
        key: 'key',
        value: 'value',
        ttl: undefined,
        tags: undefined,
      });
    });

    it('handles errors gracefully', async () => {
      mockBento.get.mockRejectedValue(new Error('Connection failed'));
      mockBento.set.mockRejectedValue(new Error('Set failed'));

      // Should not throw, returns undefined
      const result = await facade.get('key');
      expect(result).toBeUndefined();

      // Should not throw
      await expect(facade.set('key', 'value')).resolves.toBeUndefined();
    });
  });
});
