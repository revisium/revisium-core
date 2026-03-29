import { Injectable } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  RowCreatedEvent,
  RowUpdatedEvent,
  RowDeletedEvent,
  RowsDeletedEvent,
  RowRenamedEvent,
  RevisionRevertedEvent,
  RevisionCommittedEvent,
} from 'src/infrastructure/cache';
import { BillingCacheService } from './billing-cache.service';

@Injectable()
class BaseBillingCacheInvalidationHandler {
  constructor(protected readonly billingCache: BillingCacheService) {}

  protected async invalidateByRevision(revisionId: string) {
    const orgId = await this.billingCache.resolveOrgId(revisionId);
    if (orgId) {
      await this.billingCache.invalidateOrgUsage(orgId);
    }
  }
}

@EventsHandler(RowCreatedEvent)
export class BillingRowCreatedHandler
  extends BaseBillingCacheInvalidationHandler
  implements IEventHandler<RowCreatedEvent>
{
  constructor(billingCache: BillingCacheService) {
    super(billingCache);
  }

  async handle(event: RowCreatedEvent) {
    await this.invalidateByRevision(event.revisionId);
  }
}

@EventsHandler(RowUpdatedEvent)
export class BillingRowUpdatedHandler
  extends BaseBillingCacheInvalidationHandler
  implements IEventHandler<RowUpdatedEvent>
{
  constructor(billingCache: BillingCacheService) {
    super(billingCache);
  }

  async handle(event: RowUpdatedEvent) {
    await this.invalidateByRevision(event.revisionId);
  }
}

@EventsHandler(RowDeletedEvent)
export class BillingRowDeletedHandler
  extends BaseBillingCacheInvalidationHandler
  implements IEventHandler<RowDeletedEvent>
{
  constructor(billingCache: BillingCacheService) {
    super(billingCache);
  }

  async handle(event: RowDeletedEvent) {
    await this.invalidateByRevision(event.revisionId);
  }
}

@EventsHandler(RowsDeletedEvent)
export class BillingRowsDeletedHandler
  extends BaseBillingCacheInvalidationHandler
  implements IEventHandler<RowsDeletedEvent>
{
  constructor(billingCache: BillingCacheService) {
    super(billingCache);
  }

  async handle(event: RowsDeletedEvent) {
    await this.invalidateByRevision(event.revisionId);
  }
}

@EventsHandler(RowRenamedEvent)
export class BillingRowRenamedHandler
  extends BaseBillingCacheInvalidationHandler
  implements IEventHandler<RowRenamedEvent>
{
  constructor(billingCache: BillingCacheService) {
    super(billingCache);
  }

  async handle(event: RowRenamedEvent) {
    await this.invalidateByRevision(event.revisionId);
  }
}

@EventsHandler(RevisionRevertedEvent)
export class BillingRevisionRevertedHandler
  extends BaseBillingCacheInvalidationHandler
  implements IEventHandler<RevisionRevertedEvent>
{
  constructor(billingCache: BillingCacheService) {
    super(billingCache);
  }

  async handle(event: RevisionRevertedEvent) {
    await this.invalidateByRevision(event.revisionId);
  }
}

@EventsHandler(RevisionCommittedEvent)
export class BillingRevisionCommittedHandler
  extends BaseBillingCacheInvalidationHandler
  implements IEventHandler<RevisionCommittedEvent>
{
  constructor(billingCache: BillingCacheService) {
    super(billingCache);
  }

  async handle(event: RevisionCommittedEvent) {
    await this.invalidateByRevision(event.previousDraftRevisionId);
  }
}

export const BILLING_CACHE_INVALIDATION_HANDLERS = [
  BillingRowCreatedHandler,
  BillingRowUpdatedHandler,
  BillingRowDeletedHandler,
  BillingRowsDeletedHandler,
  BillingRowRenamedHandler,
  BillingRevisionRevertedHandler,
  BillingRevisionCommittedHandler,
];
