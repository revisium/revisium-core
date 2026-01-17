import { Injectable } from '@nestjs/common';
import {
  validateSchemaFormulas,
  SchemaValidationResult,
  JsonSchema as FormulaJsonSchema,
  extractSchemaFormulas,
} from '@revisium/formula';
import { JsonSchema } from '@revisium/schema-toolkit/types';
import { JsonSchemaStoreService } from 'src/features/share/json-schema-store.service';
import { FormulaService } from './formula.service';

type InputJsonSchema = JsonSchema | Record<string, unknown>;

@Injectable()
export class FormulaValidationService {
  constructor(
    private readonly formulaService: FormulaService,
    private readonly jsonSchemaStoreService: JsonSchemaStoreService,
  ) {}

  public validateSchema(schema: InputJsonSchema): SchemaValidationResult {
    const resolvedSchema = this.jsonSchemaStoreService
      .create(schema as JsonSchema)
      .getPlainSchema();

    const formulas = extractSchemaFormulas(resolvedSchema as FormulaJsonSchema);

    if (!this.formulaService.isAvailable) {
      if (formulas.length > 0) {
        return {
          isValid: false,
          errors: formulas.map((f) => ({
            field: f.fieldName,
            error: 'x-formula is not available',
          })),
        };
      }
      return { isValid: true, errors: [] };
    }

    return validateSchemaFormulas(resolvedSchema as FormulaJsonSchema);
  }
}
