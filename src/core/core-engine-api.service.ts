import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import {
  ILimitsService,
  LimitMetric,
  LIMITS_SERVICE_TOKEN,
} from 'src/features/billing/limits.interface';
import { LimitExceededException } from 'src/features/billing/limit-exceeded.exception';
import {
  RevisionCacheService,
  RevisionCommittedEvent,
  RowCacheService,
  RowCreatedEvent,
  RowUpdatedEvent,
  RowRenamedEvent,
  RowsDeletedEvent,
  TableSchemaUpdatedEvent,
  TableDeletedEvent,
  TableRenamedEvent,
  RevisionRevertedEvent,
} from 'src/infrastructure/cache';
import { RowWithContext } from 'src/features/share/types/row-with-context.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';

/**
 * Core wrapper over EngineApiService that adds:
 * - Cache (read-through for rows and revisions)
 * - Event publishing (for cache invalidation after mutations)
 * - Endpoint notifications (after mutations)
 * - Billing limit checks (resolves organizationId from revisionId)
 */
@Injectable()
export class CoreEngineApiService {
  private readonly logger = new Logger(CoreEngineApiService.name);

  constructor(
    private readonly engine: EngineApiService,
    private readonly eventBus: EventBus,
    private readonly revisionCache: RevisionCacheService,
    private readonly rowCache: RowCacheService,
    private readonly prisma: PrismaService,
    private readonly endpointNotification: EndpointNotificationService,
    @Inject(LIMITS_SERVICE_TOKEN)
    private readonly limitsService: ILimitsService,
  ) {}

  // ---- Cached reads ----

  public getRevision(data: Parameters<EngineApiService['getRevision']>[0]) {
    return this.revisionCache.revision(data, () =>
      this.engine.getRevision(data),
    );
  }

  public getRow(data: Parameters<EngineApiService['getRow']>[0]) {
    return this.rowCache.row(data, () => this.engine.getRow(data));
  }

  public getRowById(data: Parameters<EngineApiService['getRowById']>[0]) {
    return this.rowCache.row(data, () => this.engine.getRowById(data));
  }

  public getRows(data: Parameters<EngineApiService['getRows']>[0]) {
    return this.rowCache.getRows(
      data.revisionId,
      data.tableId,
      data,
      async () => {
        const result = await this.engine.getRows(data);
        void this.warmRowCache(
          result.edges.map((edge) => edge.node as RowWithContext),
        ).catch((e) => {
          this.logger.warn('Row cache warming failed (non-critical)', e);
        });
        return result;
      },
    );
  }

  // ---- Uncached reads (pass-through) ----

  public searchRows(...args: Parameters<EngineApiService['searchRows']>) {
    return this.engine.searchRows(...args);
  }

  public getTable(...args: Parameters<EngineApiService['getTable']>) {
    return this.engine.getTable(...args);
  }

  public getTables(...args: Parameters<EngineApiService['getTables']>) {
    return this.engine.getTables(...args);
  }

  public getCountRowsInTable(
    ...args: Parameters<EngineApiService['getCountRowsInTable']>
  ) {
    return this.engine.getCountRowsInTable(...args);
  }

  public resolveTableSchema(
    ...args: Parameters<EngineApiService['resolveTableSchema']>
  ) {
    return this.engine.resolveTableSchema(...args);
  }

  public resolveTableForeignKeysBy(
    ...args: Parameters<EngineApiService['resolveTableForeignKeysBy']>
  ) {
    return this.engine.resolveTableForeignKeysBy(...args);
  }

  public resolveTableForeignKeysTo(
    ...args: Parameters<EngineApiService['resolveTableForeignKeysTo']>
  ) {
    return this.engine.resolveTableForeignKeysTo(...args);
  }

  public resolveTableCountForeignKeysBy(
    ...args: Parameters<EngineApiService['resolveTableCountForeignKeysBy']>
  ) {
    return this.engine.resolveTableCountForeignKeysBy(...args);
  }

  public resolveTableCountForeignKeysTo(
    ...args: Parameters<EngineApiService['resolveTableCountForeignKeysTo']>
  ) {
    return this.engine.resolveTableCountForeignKeysTo(...args);
  }

  public resolveRowForeignKeysBy(
    ...args: Parameters<EngineApiService['resolveRowForeignKeysBy']>
  ) {
    return this.engine.resolveRowForeignKeysBy(...args);
  }

  public resolveRowForeignKeysTo(
    ...args: Parameters<EngineApiService['resolveRowForeignKeysTo']>
  ) {
    return this.engine.resolveRowForeignKeysTo(...args);
  }

  public resolveRowCountForeignKeysBy(
    ...args: Parameters<EngineApiService['resolveRowCountForeignKeysBy']>
  ) {
    return this.engine.resolveRowCountForeignKeysBy(...args);
  }

  public resolveRowCountForeignKeysTo(
    ...args: Parameters<EngineApiService['resolveRowCountForeignKeysTo']>
  ) {
    return this.engine.resolveRowCountForeignKeysTo(...args);
  }

  public getMigrations(...args: Parameters<EngineApiService['getMigrations']>) {
    return this.engine.getMigrations(...args);
  }

  public getRevisionParent(
    ...args: Parameters<EngineApiService['getRevisionParent']>
  ) {
    return this.engine.getRevisionParent(...args);
  }

  public getRevisionChild(
    ...args: Parameters<EngineApiService['getRevisionChild']>
  ) {
    return this.engine.getRevisionChild(...args);
  }

  public getRevisionChildren(
    ...args: Parameters<EngineApiService['getRevisionChildren']>
  ) {
    return this.engine.getRevisionChildren(...args);
  }

  public getTablesByRevisionId(
    ...args: Parameters<EngineApiService['getTablesByRevisionId']>
  ) {
    return this.engine.getTablesByRevisionId(...args);
  }

  public revisionChanges(
    ...args: Parameters<EngineApiService['revisionChanges']>
  ) {
    return this.engine.revisionChanges(...args);
  }

  public tableChanges(...args: Parameters<EngineApiService['tableChanges']>) {
    return this.engine.tableChanges(...args);
  }

  public rowChanges(...args: Parameters<EngineApiService['rowChanges']>) {
    return this.engine.rowChanges(...args);
  }

  public getBranch(...args: Parameters<EngineApiService['getBranch']>) {
    return this.engine.getBranch(...args);
  }

  public getBranchById(...args: Parameters<EngineApiService['getBranchById']>) {
    return this.engine.getBranchById(...args);
  }

  public getBranches(...args: Parameters<EngineApiService['getBranches']>) {
    return this.engine.getBranches(...args);
  }

  public getHeadRevision(
    ...args: Parameters<EngineApiService['getHeadRevision']>
  ) {
    return this.engine.getHeadRevision(...args);
  }

  public getDraftRevision(
    ...args: Parameters<EngineApiService['getDraftRevision']>
  ) {
    return this.engine.getDraftRevision(...args);
  }

  public getStartRevision(
    ...args: Parameters<EngineApiService['getStartRevision']>
  ) {
    return this.engine.getStartRevision(...args);
  }

  public getRevisionsByBranchId(
    ...args: Parameters<EngineApiService['getRevisionsByBranchId']>
  ) {
    return this.engine.getRevisionsByBranchId(...args);
  }

  public getTouchedByBranchId(
    ...args: Parameters<EngineApiService['getTouchedByBranchId']>
  ) {
    return this.engine.getTouchedByBranchId(...args);
  }

  public getTableViews(...args: Parameters<EngineApiService['getTableViews']>) {
    return this.engine.getTableViews(...args);
  }

  public getSubSchemaItems(
    ...args: Parameters<EngineApiService['getSubSchemaItems']>
  ) {
    return this.engine.getSubSchemaItems(...args);
  }

  // ---- Writes with events + notifications ----

  public async createTable(
    data: Parameters<EngineApiService['createTable']>[0],
  ) {
    const result = await this.engine.createTable(data);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async updateTable(
    data: Parameters<EngineApiService['updateTable']>[0],
  ) {
    const result = await this.engine.updateTable(data);
    await this.eventBus.publishAll([
      new TableSchemaUpdatedEvent(data.revisionId, data.tableId),
    ]);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async renameTable(
    data: Parameters<EngineApiService['renameTable']>[0],
  ) {
    const result = await this.engine.renameTable(data);
    await this.eventBus.publishAll([
      new TableRenamedEvent(data.revisionId, data.tableId, data.nextTableId),
    ]);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async removeTable(
    data: Parameters<EngineApiService['removeTable']>[0],
  ) {
    const result = await this.engine.removeTable(data);
    await this.eventBus.publishAll([
      new TableDeletedEvent(data.revisionId, data.tableId),
    ]);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async createRow(data: Parameters<EngineApiService['createRow']>[0]) {
    await this.checkLimit(data.revisionId, LimitMetric.ROW_VERSIONS, 1);
    const result = await this.engine.createRow(data);
    await this.eventBus.publishAll([
      new RowCreatedEvent(data.revisionId, data.tableId, data.rowId),
    ]);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async createRows(data: Parameters<EngineApiService['createRows']>[0]) {
    await this.checkLimit(
      data.revisionId,
      LimitMetric.ROW_VERSIONS,
      data.rows.length,
    );
    const result = await this.engine.createRows(data);
    const events = data.rows.map(
      (row) => new RowCreatedEvent(data.revisionId, data.tableId, row.rowId),
    );
    await this.eventBus.publishAll(events);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async updateRow(data: Parameters<EngineApiService['updateRow']>[0]) {
    await this.checkLimit(data.revisionId, LimitMetric.ROW_VERSIONS, 1);
    const result = await this.engine.updateRow(data);
    await this.eventBus.publishAll([
      new RowUpdatedEvent(data.revisionId, data.tableId, data.rowId),
    ]);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async updateRows(data: Parameters<EngineApiService['updateRows']>[0]) {
    await this.checkLimit(
      data.revisionId,
      LimitMetric.ROW_VERSIONS,
      data.rows.length,
    );
    const result = await this.engine.updateRows(data);
    const events = data.rows.map(
      (row) => new RowUpdatedEvent(data.revisionId, data.tableId, row.rowId),
    );
    await this.eventBus.publishAll(events);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async patchRow(data: Parameters<EngineApiService['patchRow']>[0]) {
    await this.checkLimit(data.revisionId, LimitMetric.ROW_VERSIONS, 1);
    const result = await this.engine.patchRow(data);
    await this.eventBus.publishAll([
      new RowUpdatedEvent(data.revisionId, data.tableId, data.rowId),
    ]);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async patchRows(data: Parameters<EngineApiService['patchRows']>[0]) {
    await this.checkLimit(
      data.revisionId,
      LimitMetric.ROW_VERSIONS,
      data.rows.length,
    );
    const result = await this.engine.patchRows(data);
    const events = data.rows.map(
      (row) => new RowUpdatedEvent(data.revisionId, data.tableId, row.rowId),
    );
    await this.eventBus.publishAll(events);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async renameRow(data: Parameters<EngineApiService['renameRow']>[0]) {
    await this.checkLimit(data.revisionId, LimitMetric.ROW_VERSIONS, 1);
    const result = await this.engine.renameRow(data);
    await this.eventBus.publishAll([
      new RowRenamedEvent(
        data.revisionId,
        data.tableId,
        data.rowId,
        data.nextRowId,
      ),
    ]);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async removeRow(data: Parameters<EngineApiService['removeRow']>[0]) {
    const result = await this.engine.removeRow(data);
    await this.eventBus.publishAll([
      new RowsDeletedEvent(data.revisionId, data.tableId, [data.rowId]),
    ]);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async removeRows(data: Parameters<EngineApiService['removeRows']>[0]) {
    const result = await this.engine.removeRows(data);
    await this.eventBus.publishAll([
      new RowsDeletedEvent(data.revisionId, data.tableId, data.rowIds),
    ]);
    await this.notifyEndpoints(data.revisionId);
    return result;
  }

  public async updateTableViews(
    data: Parameters<EngineApiService['updateTableViews']>[0],
  ) {
    return this.engine.updateTableViews(data);
  }

  public async revertChanges(
    data: Parameters<EngineApiService['revertChanges']>[0],
  ) {
    const result = await this.engine.revertChanges(data);
    const branchId = (result as { id: string }).id;
    const draftRevision = await this.engine.getDraftRevision(branchId);
    await this.eventBus.publishAll([
      new RevisionRevertedEvent((draftRevision as { id: string }).id),
    ]);
    return result;
  }

  public async createRevision(
    data: Parameters<EngineApiService['createRevision']>[0],
  ) {
    const result = await this.engine.createRevision(data);
    const { previousDraftRevisionId, previousHeadRevisionId } = result;

    // Get new draft revision (engine creates it during commit)
    const branch = await this.engine.getBranch({
      projectId: data.projectId,
      branchName: data.branchName,
    });
    const newDraft = await this.engine.getDraftRevision(branch.id);

    // Move endpoints: draft → newDraft, head → committed (previousDraftRevisionId)
    const movedEndpointIds = await this.moveEndpointsAfterCommit(
      previousDraftRevisionId,
      previousHeadRevisionId,
      newDraft.id,
    );

    await this.eventBus.publishAll([
      new RevisionCommittedEvent(
        previousHeadRevisionId,
        previousDraftRevisionId,
      ),
    ]);

    for (const endpointId of movedEndpointIds) {
      await this.endpointNotification.update(endpointId);
    }

    return result;
  }

  public async uploadFile(data: Parameters<EngineApiService['uploadFile']>[0]) {
    await this.checkLimit(data.revisionId, LimitMetric.STORAGE_BYTES);
    return this.engine.uploadFile(data);
  }

  public applyMigrations(
    ...args: Parameters<EngineApiService['applyMigrations']>
  ) {
    return this.engine.applyMigrations(...args);
  }

  public createBranch(...args: Parameters<EngineApiService['createBranch']>) {
    return this.engine.createBranch(...args);
  }

  public deleteBranch(...args: Parameters<EngineApiService['deleteBranch']>) {
    return this.engine.deleteBranch(...args);
  }

  public cleanOrphanedData() {
    return this.engine.cleanOrphanedData();
  }

  // ---- Private helpers ----

  private async notifyEndpoints(revisionId: string): Promise<void> {
    try {
      const endpoints = await this.prisma.revision
        .findUniqueOrThrow({ where: { id: revisionId } })
        .endpoints({
          where: { isDeleted: false },
          select: { id: true },
        });

      for (const { id } of endpoints) {
        await this.endpointNotification.update(id);
      }
    } catch (e) {
      this.logger.warn('Endpoint notification failed (non-critical)', e);
    }
  }

  private async moveEndpointsAfterCommit(
    previousDraftRevisionId: string,
    previousHeadRevisionId: string,
    nextDraftRevisionId: string,
  ): Promise<string[]> {
    const allEndpointIds: string[] = [];

    // Move draft endpoints → new draft
    const draftEndpoints = await this.prisma.endpoint.findMany({
      where: { revisionId: previousDraftRevisionId, isDeleted: false },
      select: { id: true },
    });
    for (const ep of draftEndpoints) {
      await this.prisma.endpoint.update({
        where: { id: ep.id },
        data: { revisionId: nextDraftRevisionId, createdAt: new Date() },
      });
      allEndpointIds.push(ep.id);
    }

    // Remove deleted endpoints on new draft
    await this.prisma.endpoint.deleteMany({
      where: { revisionId: nextDraftRevisionId, isDeleted: true },
    });

    // Move head endpoints → committed revision (previousDraftRevisionId is now head)
    const headEndpoints = await this.prisma.endpoint.findMany({
      where: { revisionId: previousHeadRevisionId, isDeleted: false },
      select: { id: true },
    });
    for (const ep of headEndpoints) {
      await this.prisma.endpoint.update({
        where: { id: ep.id },
        data: { revisionId: previousDraftRevisionId, createdAt: new Date() },
      });
      allEndpointIds.push(ep.id);
    }

    // Remove deleted endpoints on committed revision
    await this.prisma.endpoint.deleteMany({
      where: { revisionId: previousDraftRevisionId, isDeleted: true },
    });

    return allEndpointIds;
  }

  private async resolveOrganizationId(revisionId: string): Promise<string> {
    const revision = await this.prisma.revision.findUniqueOrThrow({
      where: { id: revisionId },
      select: {
        branch: {
          select: {
            project: {
              select: { organizationId: true },
            },
          },
        },
      },
    });
    return revision.branch.project.organizationId;
  }

  private async checkLimit(
    revisionId: string,
    metric: LimitMetric,
    increment?: number,
  ): Promise<void> {
    const organizationId = await this.resolveOrganizationId(revisionId);
    const result = await this.limitsService.checkLimit(
      organizationId,
      metric,
      increment,
    );
    if (!result.allowed) {
      throw new LimitExceededException(result);
    }
  }

  private async warmRowCache(rows: RowWithContext[]) {
    await Promise.all(
      rows.map((row) =>
        this.rowCache.row({ ...row.context, rowId: row.id }, () =>
          Promise.resolve(row),
        ),
      ),
    );
  }
}
