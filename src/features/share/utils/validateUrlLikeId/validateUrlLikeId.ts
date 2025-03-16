import { BadRequestException } from '@nestjs/common';

export const validateUrlLikeId = (id: string) => {
  const validPattern = /^(?!__)[a-zA-Z_][a-zA-Z0-9-_]*$/;
  const maxLength = 64;

  if (id.length < 1 || id.length > maxLength || !validPattern.test(id)) {
    throw new BadRequestException(
      `It must contain between 1 and ${maxLength} characters, start with a letter or underscore (_), cannot start with two underscores (__), and can only include letters (a-z, A-Z), numbers (0-9), hyphens (-), and underscores (_).`,
    );
  }
};
