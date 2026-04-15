import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/__generated__/client';
import { countOrgRowVersions } from 'src/__generated__/client/sql';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { buildMetric } from './build-metric';

export interface UsageSummary {
  rowVersions: { current: number; limit: number | null; percentage: number | null };
  projects: { current: number; limit: number | null; percentage: number | null };
  seats: { current: number; limit: number | null; percentage: number | null };
  storageBytes: { current: number; limit: number | null; percentage: number | null };
  endpointsPerProject: {
    current: number;
    limit: number | null;
    percentage: number | null;
  };
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async computeUsageSummary(
    organizationId: string,
    planLimits?: {
      row_versions: number | null;
      projects: number | null;
      seats: number | null;
      storage_bytes: number | null;
      endpoints_per_project: number | null;
    } | null,
  ): Promise<UsageSummary> {
    const [rowVersions, projects, seats, storageBytes, endpointsPerProject] =
      await Promise.all([
        this.computeUsage(organizationId, LimitMetric.ROW_VERSIONS),
        this.computeUsage(organizationId, LimitMetric.PROJECTS),
        this.computeUsage(organizationId, LimitMetric.SEATS),
        this.computeUsage(organizationId, LimitMetric.STORAGE_BYTES),
        this.countMaxEndpointsInProjects(organizationId),
      ]);

    return {
      rowVersions: buildMetric(rowVersions, planLimits?.row_versions),
      projects: buildMetric(projects, planLimits?.projects),
      seats: buildMetric(seats, planLimits?.seats),
      storageBytes: buildMetric(storageBytes, planLimits?.storage_bytes),
      endpointsPerProject: buildMetric(
        endpointsPerProject,
        planLimits?.endpoints_per_project,
      ),
    };
  }

  async computeUsage(
    organizationId: string,
    metric: LimitMetric,
    context?: { revisionId?: string; tableId?: string; projectId?: string },
  ): Promise<number> {
    switch (metric) {
      case LimitMetric.ROW_VERSIONS:
        return this.countRowVersions(organizationId);
      case LimitMetric.PROJECTS:
        return this.countProjects(organizationId);
      case LimitMetric.SEATS:
        return this.countSeats(organizationId);
      case LimitMetric.STORAGE_BYTES:
        return this.countStorageBytes(organizationId);
      case LimitMetric.API_CALLS:
        return this.countApiCalls(organizationId);
      case LimitMetric.ROWS_PER_TABLE: {
        if (!context?.revisionId || !context?.tableId) {
          throw new Error('ROWS_PER_TABLE requires revisionId and tableId in context');
        }
        return this.countRowsInTable(context.revisionId, context.tableId);
      }
      case LimitMetric.TABLES_PER_REVISION: {
        if (!context?.projectId) {
          throw new Error('TABLES_PER_REVISION requires projectId in context');
        }
        return this.countTablesInRevision(context.projectId);
      }
      case LimitMetric.BRANCHES_PER_PROJECT: {
        if (!context?.projectId) {
          throw new Error('BRANCHES_PER_PROJECT requires projectId in context');
        }
        return this.countBranchesInProject(context.projectId);
      }
      case LimitMetric.ENDPOINTS_PER_PROJECT: {
        if (!context?.projectId) {
          throw new Error('ENDPOINTS_PER_PROJECT requires projectId in context');
        }
        return this.countEndpointsInProject(context.projectId);
      }
      default: {
        const _exhaustive: never = metric;
        throw new Error(`Unknown limit metric: ${_exhaustive}`);
      }
    }
  }

  /**
   * Count UNIQUE row versions across all revisions in all projects of the org.
   * Copy-on-write: unchanged rows share versionId - counted once.
   */
  private async countRowVersions(organizationId: string): Promise<number> {
    const result = await this.prisma.$queryRawTyped(
      countOrgRowVersions(organizationId),
    );
    return Number(result[0].count);
  }

  private async countProjects(organizationId: string): Promise<number> {
    return this.prisma.project.count({
      where: { organizationId, isDeleted: false },
    });
  }

  private async countSeats(organizationId: string): Promise<number> {
    return this.prisma.userOrganization.count({
      where: { organizationId },
    });
  }

  private async countStorageBytes(_organizationId: string): Promise<number> {
    // TODO: implement based on File plugin storage tracking
    return 0;
  }

  private async countApiCalls(_organizationId: string): Promise<number> {
    // TODO: implement based on API request tracking
    return 0;
  }

  private async countRowsInTable(
    revisionId: string,
    tableId: string,
  ): Promise<number> {
    const table = await this.prisma.table.findFirst({
      where: {
        id: tableId,
        revisions: { some: { id: revisionId } },
      },
      select: { _count: { select: { rows: true } } },
    });
    return table?._count.rows ?? 0;
  }

  private async countTablesInRevision(projectId: string): Promise<number> {
    const revision = await this.prisma.revision.findFirst({
      where: {
        isDraft: true,
        branch: { projectId, isRoot: true },
      },
      select: { _count: { select: { tables: true } } },
    });
    return revision?._count.tables ?? 0;
  }

  private async countBranchesInProject(projectId: string): Promise<number> {
    return this.prisma.branch.count({ where: { projectId } });
  }

  private async countEndpointsInProject(projectId: string): Promise<number> {
    return this.prisma.endpoint.count({
      where: {
        revision: { branch: { projectId } },
        isDeleted: false,
      },
    });
  }

  private async countMaxEndpointsInProjects(
    organizationId: string,
  ): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ maxCount: bigint | number }>>(
      Prisma.sql`
        SELECT COALESCE(MAX(project_counts.count), 0)::bigint AS "maxCount"
        FROM (
          SELECT COUNT(e."id")::bigint AS count
          FROM "Project" p
          LEFT JOIN "Branch" b
            ON b."projectId" = p."id"
          LEFT JOIN "Revision" r
            ON r."branchId" = b."id"
          LEFT JOIN "Endpoint" e
            ON e."revisionId" = r."id"
           AND e."isDeleted" = false
          WHERE p."organizationId" = ${organizationId}
            AND p."isDeleted" = false
          GROUP BY p."id"
        ) AS project_counts
      `,
    );

    return Number(result[0]?.maxCount ?? 0);
  }
}
