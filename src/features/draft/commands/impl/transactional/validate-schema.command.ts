import { Prisma } from 'src/__generated__/client';

export class ValidateSchemaCommand {
  constructor(readonly schema: Prisma.InputJsonValue) {}
}
