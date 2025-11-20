import { Branch } from 'src/__generated__/client';
import { BranchModel } from 'src/api/rest-api/branch/model';

export const transformFromPrismaToBranchModel = (data: Branch): BranchModel => {
  return {
    ...data,
  };
};
