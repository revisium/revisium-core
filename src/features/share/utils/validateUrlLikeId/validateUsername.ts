import { BadRequestException } from '@nestjs/common';
import { RESERVED_USERNAMES } from './reserved-names';
import {
  validateUrlLikeId,
  VALIDATE_URL_LIKE_ID_ERROR_MESSAGE,
} from './validateUrlLikeId';

export const RESERVED_USERNAME_ERROR_MESSAGE =
  'This username is reserved and cannot be used.';

export const validateUsername = (username: string): void => {
  validateUrlLikeId(username);

  const normalized = username.toLowerCase();

  if (
    RESERVED_USERNAMES.includes(
      normalized as (typeof RESERVED_USERNAMES)[number],
    )
  ) {
    throw new BadRequestException(RESERVED_USERNAME_ERROR_MESSAGE);
  }
};

export { VALIDATE_URL_LIKE_ID_ERROR_MESSAGE as USERNAME_FORMAT_ERROR_MESSAGE };
