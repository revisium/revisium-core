import { Injectable } from '@nestjs/common';
import {
  validateSchemaFormulas,
  SchemaValidationResult,
  JsonSchema as FormulaJsonSchema,
  extractSchemaFormulas,
} from '@revisium/formula';
import { FormulaService } from './formula.service';

type JsonSchema = {
  type?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
};

@Injectable()
export class FormulaValidationService {
  constructor(private readonly formulaService: FormulaService) {}

  public validateSchema(schema: JsonSchema): SchemaValidationResult {
    const formulas = extractSchemaFormulas(schema as FormulaJsonSchema);

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

    return validateSchemaFormulas(schema as FormulaJsonSchema);
  }
}
