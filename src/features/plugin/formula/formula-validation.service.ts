import { Injectable } from '@nestjs/common';
import {
  validateSchemaFormulas,
  extractSchemaFormulas,
  type SchemaValidationResult,
} from '@revisium/schema-toolkit/formula';
import { JsonSchema } from '@revisium/schema-toolkit/types';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';

type InputJsonSchema = JsonSchema | Record<string, unknown>;

@Injectable()
export class FormulaValidationService {
  constructor(
    private readonly jsonSchemaStoreService: JsonSchemaStoreService,
  ) {}

  public validateSchema(schema: InputJsonSchema): SchemaValidationResult {
    const resolvedSchema = this.jsonSchemaStoreService
      .create(schema as JsonSchema)
      .getPlainSchema();

    return validateSchemaFormulas(resolvedSchema as Record<string, unknown>);
  }
}
