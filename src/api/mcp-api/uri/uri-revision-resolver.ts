import { BranchApiService } from 'src/features/branch/branch-api.service';
import { ProjectApiService } from 'src/features/project/project-api.service';
import { ParsedUri } from './parse-revisium-uri';

export class UriRevisionResolver {
  constructor(
    private readonly projectApi: ProjectApiService,
    private readonly branches: BranchApiService,
  ) {}

  async resolve(parsed: ParsedUri): Promise<string> {
    if (parsed.revision !== 'draft' && parsed.revision !== 'head') {
      return parsed.revision;
    }

    const project = await this.projectApi.getProject({
      organizationId: parsed.organizationId,
      projectName: parsed.projectName,
    });
    const branch = await this.branches.getBranch({
      projectId: project.id,
      branchName: parsed.branchName,
    });

    if (parsed.revision === 'head') {
      const head = await this.branches.getHeadRevision(branch.id);
      return head.id;
    }

    const draft = await this.branches.getDraftRevision(branch.id);
    return draft.id;
  }
}
