import { Injectable } from '@nestjs/common';
import { EngineApiService } from '@revisium/engine';
import { ProjectFileUsageReportModel } from 'src/api/graphql-api/file-usage/model/project-file-usage-report.model';
import { RestoreProjectFileBytesResultModel } from 'src/api/graphql-api/file-usage/model/restore-project-file-bytes-result.model';

@Injectable()
export class FileUsageAdminService {
  constructor(private readonly engine: EngineApiService) {}

  public async validate(
    projectId: string,
  ): Promise<ProjectFileUsageReportModel> {
    const report = await this.engine.validateProjectFileBytes({ projectId });

    return {
      projectId: report.projectId,
      currentFileBytes: report.currentFileBytes.toString(),
      expectedFileBytes: report.expectedFileBytes.toString(),
      drift: report.drift.toString(),
      fileBlobCount: report.fileBlobCount,
      referenceCount: report.referenceCount,
    };
  }

  public async restore(
    projectId: string,
    dryRun: boolean,
  ): Promise<RestoreProjectFileBytesResultModel> {
    if (dryRun) {
      return this.previewRestore(projectId);
    }

    const applied = await this.engine.restoreProjectFileBytes({ projectId });

    return {
      projectId: applied.projectId,
      previousFileBytes: applied.previousFileBytes.toString(),
      nextFileBytes: applied.nextFileBytes.toString(),
      drift: applied.drift.toString(),
      dryRun: false,
    };
  }

  private async previewRestore(
    projectId: string,
  ): Promise<RestoreProjectFileBytesResultModel> {
    const report = await this.engine.validateProjectFileBytes({ projectId });

    return {
      projectId: report.projectId,
      previousFileBytes: report.currentFileBytes.toString(),
      nextFileBytes: report.expectedFileBytes.toString(),
      drift: report.drift.toString(),
      dryRun: true,
    };
  }
}
