import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EngineApiService } from '@revisium/engine';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { CreateBranchCommand } from './commands/impl';

@Injectable()
export class BranchApiService {
  constructor(
    private readonly engine: EngineApiService,
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

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

  public getTouchedByBranchId(
    ...args: Parameters<EngineApiService['getTouchedByBranchId']>
  ) {
    return this.engine.getTouchedByBranchId(...args);
  }

  public createBranch(data: Parameters<EngineApiService['createBranch']>[0]) {
    return this.commandBus.execute(new CreateBranchCommand(data));
  }

  public deleteBranch(...args: Parameters<EngineApiService['deleteBranch']>) {
    return this.engine.deleteBranch(...args);
  }

  public resolveParentBranch(
    ...args: Parameters<EngineApiService['resolveParentBranch']>
  ) {
    return this.engine.resolveParentBranch(...args);
  }

  public async getProjectByBranch(branchId: string) {
    const { id } = await this.engine.getProjectByBranch(branchId);
    return this.prisma.project.findUniqueOrThrow({ where: { id } });
  }

  public cleanOrphanedData() {
    return this.engine.cleanOrphanedData();
  }
}
