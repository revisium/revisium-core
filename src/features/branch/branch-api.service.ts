import { Injectable } from '@nestjs/common';
import {
  EngineApiService,
  ResolveParentBranchByBranchQueryData,
  Revision,
} from '@revisium/engine';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

@Injectable()
export class BranchApiService {
  constructor(
    private readonly engine: EngineApiService,
    private readonly prisma: PrismaService,
  ) {}

  public resolveParentBranch(data: ResolveParentBranchByBranchQueryData) {
    return this.engine.resolveParentBranch(data);
  }

  public async getProjectByBranch(branchId: string) {
    const { id } = await this.engine.getProjectByBranch(branchId);
    return this.prisma.project.findUniqueOrThrow({ where: { id } });
  }

  public getHeadRevision(branchId: string): Promise<Revision> {
    return this.engine.getHeadRevision(branchId);
  }

  public getDraftRevision(branchId: string): Promise<Revision> {
    return this.engine.getDraftRevision(branchId);
  }
}
