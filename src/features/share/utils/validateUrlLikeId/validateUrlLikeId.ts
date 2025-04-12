import { BadRequestException } from '@nestjs/common';

const MAX_LENGTH = 64;

export const VALIDATE_URL_LIKE_ID_ERROR_MESSAGE = `It must contain between 1 and ${MAX_LENGTH} characters, start with a letter or underscore (_), cannot start with two underscores (__), and can only include letters (a-z, A-Z), numbers (0-9), hyphens (-), and underscores (_).`;

export const validateUrlLikeId = (id: string) => {
  const validPattern = /^(?!__)[a-zA-Z_][a-zA-Z0-9-_]*$/;
  const maxLength = 64;

  if (id.length < 1 || id.length > maxLength || !validPattern.test(id)) {
    throw new BadRequestException(VALIDATE_URL_LIKE_ID_ERROR_MESSAGE);
  }
};
