import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';

@Injectable()
export class IdService {
  public generate(size?: number) {
    return nanoid(size);
  }
}
