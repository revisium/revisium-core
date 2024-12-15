import { GetBranchByIdReturnType } from 'src/branch/quieries/types/get-branch-by-id.types';
import { GetTableByIdReturnType } from 'src/table/queries/types';

export type ApiRemoveRowHandlerReturnType = {
  branch: GetBranchByIdReturnType;
  table: GetTableByIdReturnType;
  previousVersionTableId?: string;
};
