import { BadRequestException } from '@nestjs/common';
import { SYSTEM_TABLE_PREFIX } from 'src/features/share/system-tables.consts';

const TABLE_ID_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
const TABLE_ID_MAX_LENGTH = 64;
const TABLE_ID_MIN_LENGTH = 1;

export const TABLE_ID_ERROR_MESSAGE =
  `Table ID must be ${TABLE_ID_MIN_LENGTH} to ${TABLE_ID_MAX_LENGTH} characters, ` +
  `start with a letter or underscore, and contain only letters (a-z, A-Z), ` +
  `digits (0-9), underscores (_), and hyphens (-).`;

export const TABLE_ID_SYSTEM_PREFIX_ERROR_MESSAGE = `Table ID cannot start with "${SYSTEM_TABLE_PREFIX}" prefix (reserved for system tables).`;

export const validateTableId = (id: string): void => {
  if (
    id.length < TABLE_ID_MIN_LENGTH ||
    id.length > TABLE_ID_MAX_LENGTH ||
    !TABLE_ID_PATTERN.test(id)
  ) {
    throw new BadRequestException(TABLE_ID_ERROR_MESSAGE);
  }

  if (id.startsWith(SYSTEM_TABLE_PREFIX)) {
    throw new BadRequestException(TABLE_ID_SYSTEM_PREFIX_ERROR_MESSAGE);
  }
};
