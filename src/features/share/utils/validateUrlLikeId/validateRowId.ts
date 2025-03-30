import { BadRequestException } from '@nestjs/common';

export const validateRowId = (id: string) => {
  const validPattern = /^\w[\w-]*$/;
  const maxLength = 64;

  if (id.length < 1 || id.length > maxLength || !validPattern.test(id)) {
    throw new BadRequestException(
      `Row ID must be 1 to ${maxLength} characters long, start with a letter, digit, or underscore, and can only include letters (a-z, A-Z), digits (0-9), hyphens (-), and underscores (_).`,
    );
  }
};
