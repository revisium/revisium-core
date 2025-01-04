import { GetBranchByIdReturnType } from 'src/features/branch/quieries/types/get-branch-by-id.types';
import { GetTableByIdReturnType } from 'src/features/table/queries/types';

export type ApiRemoveRowHandlerReturnType = {
  branch: GetBranchByIdReturnType;
  table: GetTableByIdReturnType;
  previousVersionTableId?: string;
};
