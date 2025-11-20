import objectHash from 'object-hash';

export class HashService {
  public async hashObject(data: objectHash.NotUndefined) {
    return objectHash(data);
  }
}
