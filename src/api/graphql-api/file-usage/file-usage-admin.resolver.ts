import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { PermissionParams } from 'src/features/auth/guards/permission-params';
import { GQLProjectGuard } from 'src/features/auth/guards/project.guard';
import { FileUsageAdminService } from 'src/api/graphql-api/file-usage/file-usage-admin.service';
import {
  RestoreProjectFileBytesInput,
  ValidateProjectFileBytesInput,
} from 'src/api/graphql-api/file-usage/model/file-usage-inputs';
import { ProjectFileUsageReportModel } from 'src/api/graphql-api/file-usage/model/project-file-usage-report.model';
import { RestoreProjectFileBytesResultModel } from 'src/api/graphql-api/file-usage/model/restore-project-file-bytes-result.model';

@Resolver()
export class FileUsageAdminResolver {
  constructor(private readonly service: FileUsageAdminService) {}

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.read,
    subject: PermissionSubject.FileUsage,
  })
  @Query(() => ProjectFileUsageReportModel)
  public adminValidateProjectFileBytes(
    @Args('data') data: ValidateProjectFileBytesInput,
  ): Promise<ProjectFileUsageReportModel> {
    return this.service.validate(data.projectId);
  }

  @UseGuards(GqlJwtAuthGuard, GQLProjectGuard)
  @PermissionParams({
    action: PermissionAction.manage,
    subject: PermissionSubject.FileUsage,
  })
  @Mutation(() => RestoreProjectFileBytesResultModel)
  public adminRestoreProjectFileBytes(
    @Args('data') data: RestoreProjectFileBytesInput,
  ): Promise<RestoreProjectFileBytesResultModel> {
    return this.service.restore(data.projectId, data.dryRun);
  }
}
