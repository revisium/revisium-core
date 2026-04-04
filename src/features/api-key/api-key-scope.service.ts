import { Injectable } from '@nestjs/common';
import { ApiKey } from 'src/__generated__/client';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const DEFAULT_BRANCH_TOKEN = '$default';

export interface ScopeRequest {
  organizationId?: string;
  projectId?: string;
  branchName?: string;
  tableId?: string;
}

@Injectable()
export class ApiKeyScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveBranchNames(
    branchNames: string[],
    projectId: string,
  ): Promise<string[]> {
    if (!branchNames.includes(DEFAULT_BRANCH_TOKEN)) {
      return branchNames;
    }

    const rootBranch = await this.prisma.branch.findFirst({
      where: { projectId, isRoot: true },
      select: { name: true },
    });

    return branchNames
      .map((name) =>
        name === DEFAULT_BRANCH_TOKEN && rootBranch ? rootBranch.name : name,
      )
      .filter((name) => name !== DEFAULT_BRANCH_TOKEN);
  }

  validateScope(
    apiKey: ApiKey,
    request: ScopeRequest,
    resolvedBranchNames?: string[],
  ): boolean {
    return (
      this.matchesOrganization(apiKey, request) &&
      this.matchesProject(apiKey, request) &&
      this.matchesBranch(resolvedBranchNames ?? apiKey.branchNames, request) &&
      this.matchesTable(apiKey, request)
    );
  }

  private matchesOrganization(apiKey: ApiKey, request: ScopeRequest): boolean {
    if (!apiKey.organizationId) {
      return true;
    }
    if (!request.organizationId) {
      return true;
    }
    return apiKey.organizationId === request.organizationId;
  }

  private matchesProject(apiKey: ApiKey, request: ScopeRequest): boolean {
    if (apiKey.projectIds.length === 0) {
      return true;
    }
    if (!request.projectId) {
      return true;
    }
    return apiKey.projectIds.includes(request.projectId);
  }

  private matchesBranch(branchNames: string[], request: ScopeRequest): boolean {
    if (branchNames.length === 0) {
      return true;
    }
    if (!request.branchName) {
      return true;
    }
    return branchNames.includes(request.branchName);
  }

  private matchesTable(apiKey: ApiKey, request: ScopeRequest): boolean {
    if (apiKey.tableIds.length === 0) {
      return true;
    }
    if (!request.tableId) {
      return true;
    }
    return apiKey.tableIds.includes(request.tableId);
  }
}
