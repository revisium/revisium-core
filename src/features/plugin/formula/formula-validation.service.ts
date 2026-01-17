import { Injectable } from '@nestjs/common';
import {
  validateSchemaFormulas,
  SchemaValidationResult,
  JsonSchema as FormulaJsonSchema,
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
    if (!this.formulaService.isAvailable) {
      return { isValid: true, errors: [] };
    }

    return validateSchemaFormulas(schema as FormulaJsonSchema);
  }
}
