import { IEvent } from '@nestjs/cqrs';

/**
 * Base cache event
 */
export abstract class CacheEvent implements IEvent {
  public readonly timestamp = new Date();
}
