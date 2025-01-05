import { GetBranchByIdReturnType } from 'src/features/branch/quieries/types/get-branch-by-id.types';

export class ApiRevertChangesCommand {
  constructor(
    public data: {
      organizationId: string;
      projectName: string;
      branchName: string;
    },
  ) {}
}

export type ApiRevertChangesCommandReturnType = GetBranchByIdReturnType;
