import { Branch } from '@prisma/client';
import { BranchModel } from 'src/rest-api/branch/model';

export const transformFromPrismaToBranchModel = (data: Branch): BranchModel => {
  return {
    ...data,
  };
};
