import { BadRequestException } from '@nestjs/common';

export function validateSchemaForeignKeys(schema: unknown): void {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  const obj = schema as Record<string, unknown>;

  if ('foreignKey' in obj && typeof obj.foreignKey !== 'string') {
    throw new BadRequestException(
      'foreignKey must be a string (table ID), e.g. "categories"',
    );
  }

  if (obj.properties && typeof obj.properties === 'object') {
    for (const [, prop] of Object.entries(
      obj.properties as Record<string, unknown>,
    )) {
      validateSchemaForeignKeys(prop);
    }
  }

  if (obj.items && typeof obj.items === 'object') {
    validateSchemaForeignKeys(obj.items);
  }
}

export function validatePatchForeignKeys(
  patches: Array<{ op: string; path: string; value?: unknown }>,
): void {
  for (const patch of patches) {
    if (
      (patch.op === 'add' || patch.op === 'replace') &&
      patch.value !== undefined
    ) {
      validateSchemaForeignKeys(patch.value);
    }
  }
}
