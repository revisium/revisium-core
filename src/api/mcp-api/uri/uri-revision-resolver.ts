import { BranchApiService } from 'src/features/branch/branch-api.service';
import { ParsedUri } from './parse-revisium-uri';

export class UriRevisionResolver {
  constructor(private readonly branchApi: BranchApiService) {}

  async resolve(parsed: ParsedUri): Promise<string> {
    if (parsed.revision !== 'draft' && parsed.revision !== 'head') {
      return parsed.revision;
    }

    const branch = await this.branchApi.getBranch({
      organizationId: parsed.organizationId,
      projectName: parsed.projectName,
      branchName: parsed.branchName,
    });

    if (parsed.revision === 'head') {
      const head = await this.branchApi.getHeadRevision(branch.id);
      return head.id;
    }

    const draft = await this.branchApi.getDraftRevision(branch.id);
    return draft.id;
  }
}
