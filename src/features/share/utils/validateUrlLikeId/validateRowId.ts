import { BadRequestException } from '@nestjs/common';

const ROW_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const ROW_ID_MAX_LENGTH = 64;
const ROW_ID_MIN_LENGTH = 1;

export const ROW_ID_ERROR_MESSAGE =
  `Row ID must be ${ROW_ID_MIN_LENGTH} to ${ROW_ID_MAX_LENGTH} characters ` +
  `and contain only letters (a-z, A-Z), digits (0-9), underscores (_), and hyphens (-).`;

export const validateRowId = (id: string): void => {
  if (
    id.length < ROW_ID_MIN_LENGTH ||
    id.length > ROW_ID_MAX_LENGTH ||
    !ROW_ID_PATTERN.test(id)
  ) {
    throw new BadRequestException(ROW_ID_ERROR_MESSAGE);
  }
};
