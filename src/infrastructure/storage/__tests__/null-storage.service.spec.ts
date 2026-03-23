import { NullStorageService } from '../null-storage.service';

describe('NullStorageService', () => {
  const service = new NullStorageService();

  it('should not be available', () => {
    expect(service.isAvailable).toBe(false);
  });

  it('should throw on uploadFile', async () => {
    await expect(service.uploadFile()).rejects.toThrow(
      'Storage is not configured',
    );
  });

  it('should return empty string for getPublicUrl', () => {
    expect(service.getPublicUrl('any-key')).toBe('');
  });
});
