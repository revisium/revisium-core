import { HashService } from 'src/infrastructure/database/hash.service';

describe('HashService', () => {
  let hashService: HashService;

  beforeAll(() => {
    hashService = new HashService();
  });

  it('should return the correct hash for a simple object', async () => {
    const hash = await hashService.hashObject({ a: 1, b: 'test' });

    expect(hash).toBe('f2e43d30ae174924d9c6eead782c5c51dc17f74f');
  });

  it('should return the same hash for identical objects', async () => {
    const hash1 = await hashService.hashObject({
      a: 1,
      b: [2, 3],
      c: { d: 'nested', e: 1 },
    });
    const hash2 = await hashService.hashObject({
      c: { e: 1, d: 'nested' },
      b: [2, 3],
      a: 1,
    });

    expect(hash1).toBe('3341e5815048f913b7d73d8eaaf7bf080c97dbdd');
    expect(hash2).toBe('3341e5815048f913b7d73d8eaaf7bf080c97dbdd');
  });

  it('should return different hashes for different objects', async () => {
    const hash1 = await hashService.hashObject({ a: 1 });
    const hash2 = await hashService.hashObject({ a: 2 });

    expect(hash1).toBe('ca1a41f90da606b052ecf10c8286817813bc8861');
    expect(hash2).toBe('2f4c4574f701afef16533f4df50c4adcef384b3c');
  });

  it('should correctly hash arrays', async () => {
    const hash = await hashService.hashObject([1, 2, { a: 'b' }, [3, 4]]);

    expect(hash).toBe('5ff3349dc0402360fb8329effaefc90faa7aa48b');
  });

  it('should handle empty objects and arrays', async () => {
    const hashObject = await hashService.hashObject({});
    const hashArray = await hashService.hashObject([]);

    expect(hashObject).toBe('323217f643c3e3f1fe7532e72ac01bb0748c97be');
    expect(hashArray).toBe('989db2448f309bfdd99b513f37c84b8f5794d2b5');
  });

  it('should handle primitives', async () => {
    const hashString = await hashService.hashObject('test');
    const hashNumber = await hashService.hashObject(145);
    const hashBoolean = await hashService.hashObject(true);

    expect(hashString).toBe('8d56ea07e4ac6175807ed5f66279715d394d8885');
    expect(hashNumber).toBe('9881a1ddd908e48c85b061a53af050d998dac2db');
    expect(hashBoolean).toBe('cdf22d2a18b96ef07f6105cd8093ae12a8772cb3');
  });

  it('should handle if data contains circular references', async () => {
    const data: any = { a: 1 };
    data.self = data;

    const hash = await hashService.hashObject(data);

    expect(hash).toBe('6fea67d40efe029697e23c78ff839e360f7d037c');
  });
});
