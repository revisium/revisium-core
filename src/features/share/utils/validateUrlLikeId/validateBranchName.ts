import { BadRequestException } from '@nestjs/common';
import { RESERVED_BRANCH_NAMES } from './reserved-names';
import { validateUrlLikeId } from './validateUrlLikeId';

export const RESERVED_BRANCH_NAME_ERROR_MESSAGE =
  'This branch name is reserved and cannot be used.';

export const validateBranchName = (branchName: string): void => {
  validateUrlLikeId(branchName);

  const normalized = branchName.toLowerCase();

  if (
    RESERVED_BRANCH_NAMES.includes(
      normalized as (typeof RESERVED_BRANCH_NAMES)[number],
    )
  ) {
    throw new BadRequestException(RESERVED_BRANCH_NAME_ERROR_MESSAGE);
  }
};

export { VALIDATE_URL_LIKE_ID_ERROR_MESSAGE as BRANCH_NAME_FORMAT_ERROR_MESSAGE } from './validateUrlLikeId';
