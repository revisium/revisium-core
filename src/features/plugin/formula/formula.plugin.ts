import { Injectable } from '@nestjs/common';
import {
  evaluate,
  extractSchemaFormulas,
  buildDependencyGraph,
  getTopologicalOrder,
  parseFormula,
  ExtractedFormula,
} from '@revisium/formula';
import {
  createJsonValueStore,
  traverseValue,
} from '@revisium/schema-toolkit/lib';
import { JsonValueStore } from '@revisium/schema-toolkit/model';
import { JsonValue, JsonSchemaTypeName } from '@revisium/schema-toolkit/types';
import {
  ComputeRowsResult,
  FormulaFieldError,
  InternalAfterCreateRowOptions,
  InternalAfterMigrateRowsOptions,
  InternalAfterUpdateRowOptions,
  InternalComputeRowsOptions,
  IPluginService,
} from 'src/features/plugin/types';

interface FormulaWithDefault extends ExtractedFormula {
  defaultValue: unknown;
  dependencies: string[];
}

@Injectable()
export class FormulaPlugin implements IPluginService {
  public readonly isAvailable = true;

  public afterCreateRow(options: InternalAfterCreateRowOptions): void {
    this.setFormulaValue(options.valueStore);
  }

  public afterUpdateRow(options: InternalAfterUpdateRowOptions): void {
    this.setFormulaValue(options.valueStore);
  }

  public computeRows(options: InternalComputeRowsOptions): ComputeRowsResult {
    const schema = options.schemaStore.getPlainSchema() as Record<
      string,
      unknown
    >;
    const formulas = extractSchemaFormulas(schema);

    if (formulas.length === 0) {
      return {};
    }

    const orderedFormulas = this.getOrderedFormulas(formulas, schema);
    const allErrors = new Map<string, FormulaFieldError[]>();

    for (const row of options.rows) {
      const valueStore = createJsonValueStore(
        options.schemaStore,
        '',
        row.data,
      );

      const data = valueStore.getPlainValue() as Record<string, unknown>;
      const errors = this.evaluateFormulas(data, orderedFormulas);

      if (errors.length > 0) {
        allErrors.set(row.id, errors);
      }

      row.data = data as JsonValue;
    }

    return allErrors.size > 0 ? { formulaErrors: allErrors } : {};
  }

  public afterMigrateRows(options: InternalAfterMigrateRowsOptions): void {
    const schema = options.schemaStore.getPlainSchema() as Record<
      string,
      unknown
    >;
    const formulas = extractSchemaFormulas(schema);

    if (formulas.length === 0) {
      return;
    }

    const orderedFormulas = this.getOrderedFormulas(formulas, schema);

    for (const row of options.rows) {
      const valueStore = createJsonValueStore(
        options.schemaStore,
        '',
        row.data,
      );

      const data = valueStore.getPlainValue() as Record<string, unknown>;
      this.evaluateFormulas(data, orderedFormulas);

      row.data = data as JsonValue;
    }
  }

  private getTypeDefault(fieldType: string): unknown {
    switch (fieldType) {
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'string':
      default:
        return '';
    }
  }

  private forEachFormulaField(
    valueStore: JsonValueStore,
    callback: (store: JsonValueStore) => void,
  ): void {
    traverseValue(valueStore, (item) => {
      const schema = item.schema as { 'x-formula'?: unknown };
      if (schema['x-formula']) {
        callback(item);
      }
    });
  }

  private setFormulaValue(valueStore: JsonValueStore): void {
    this.forEachFormulaField(valueStore, (item) => {
      const defaultValue = item.schema.default;

      if (item.type === JsonSchemaTypeName.Number) {
        item.value = typeof defaultValue === 'number' ? defaultValue : 0;
      } else if (item.type === JsonSchemaTypeName.String) {
        item.value = typeof defaultValue === 'string' ? defaultValue : '';
      } else if (item.type === JsonSchemaTypeName.Boolean) {
        item.value = typeof defaultValue === 'boolean' ? defaultValue : false;
      }
    });
  }

  private getOrderedFormulas(
    formulas: ExtractedFormula[],
    schema: Record<string, unknown>,
  ): FormulaWithDefault[] {
    const properties = (schema.properties ?? {}) as Record<
      string,
      { default?: unknown }
    >;

    const formulasWithMeta: FormulaWithDefault[] = formulas.map((formula) => {
      let dependencies: string[] = [];
      try {
        const parsed = parseFormula(formula.expression);
        dependencies = parsed.dependencies;
      } catch {
        // If parsing fails, dependencies will be empty - formula will fail at evaluation time
      }
      const fieldSchema = properties[formula.fieldName];
      return {
        ...formula,
        defaultValue:
          fieldSchema?.default ?? this.getTypeDefault(formula.fieldType),
        dependencies,
      };
    });

    if (formulas.length <= 1) {
      return formulasWithMeta;
    }

    const dependencies: Record<string, string[]> = {};
    for (const formula of formulasWithMeta) {
      dependencies[formula.fieldName] = formula.dependencies;
    }

    const graph = buildDependencyGraph(dependencies);
    const result = getTopologicalOrder(graph);

    if (!result.success) {
      throw new Error(
        `Cyclic dependency detected in formulas: ${result.error ?? 'unknown error'}`,
      );
    }

    const formulaMap = new Map(formulasWithMeta.map((f) => [f.fieldName, f]));
    const ordered: FormulaWithDefault[] = [];

    for (const fieldName of result.order) {
      const formula = formulaMap.get(fieldName);
      if (formula) {
        ordered.push(formula);
      }
    }

    return ordered;
  }

  private evaluateFormulas(
    data: Record<string, unknown>,
    formulas: FormulaWithDefault[],
  ): FormulaFieldError[] {
    const errors: FormulaFieldError[] = [];
    const failedFields = new Set<string>();

    for (const formula of formulas) {
      const hasDependencyFailure = formula.dependencies.some((dep) =>
        failedFields.has(dep),
      );

      if (hasDependencyFailure) {
        failedFields.add(formula.fieldName);
        data[formula.fieldName] = formula.defaultValue;
        errors.push({
          field: formula.fieldName,
          expression: formula.expression,
          error: 'Dependency formula failed',
          defaultUsed: true,
        });
        continue;
      }

      try {
        const result = evaluate(formula.expression, data);
        data[formula.fieldName] = result;
      } catch (error) {
        failedFields.add(formula.fieldName);
        data[formula.fieldName] = formula.defaultValue;
        errors.push({
          field: formula.fieldName,
          expression: formula.expression,
          error: error instanceof Error ? error.message : String(error),
          defaultUsed: true,
        });
      }
    }

    return errors;
  }
}
