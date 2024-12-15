import { Prisma } from '@prisma/client';

export class ValidateSchemaCommand {
  constructor(readonly schema: Prisma.InputJsonValue) {}
}
