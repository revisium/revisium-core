import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Ajv, { ErrorObject, Schema, ValidateFunction } from 'ajv/dist/2020';
import * as hash from 'object-hash';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { historyPatchesSchema } from 'src/features/share/schema/history-patches-schema';
import { jsonPatchSchema } from 'src/features/share/schema/json-patch-schema';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import {
  ajvFileSchema,
  ajvRowCreatedAtSchema,
  ajvRowCreatedIdSchema,
  ajvRowHashSchema,
  ajvRowIdSchema,
  ajvRowPublishedAtSchema,
  ajvRowSchemaHashSchema,
  ajvRowUpdatedAtSchema,
  ajvRowVersionIdSchema,
} from 'src/features/share/schema/plugins';

const DEFAULT_TIME_EXPIRATION = 24 * 60 * 60 * 1000;

@Injectable()
export class JsonSchemaValidatorService {
  public readonly metaSchemaHash: string;

  private readonly ajv = new Ajv();

  private readonly metaSchemaValidateFunction: ValidateFunction;
  private readonly jsonPatchSchemaValidateFunction: ValidateFunction;
  private readonly historyPatchesSchemaValidate: ValidateFunction;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    this.ajv.addKeyword({
      keyword: CustomSchemeKeywords.ForeignKey,
      type: 'string',
    });
    this.ajv.addFormat('regex', {
      type: 'string',
      validate: (str: string) => {
        try {
          new RegExp(str);
          return true;
        } catch {
          return false;
        }
      },
    });

    this.compilePluginSchemas();
    this.metaSchemaValidateFunction = this.ajv.compile(metaSchema);
    this.jsonPatchSchemaValidateFunction = this.ajv.compile(jsonPatchSchema);
    this.historyPatchesSchemaValidate = this.ajv.compile(historyPatchesSchema);
    this.metaSchemaHash = this.getSchemaHash(metaSchema);
  }

  public validateMetaSchema(data: unknown) {
    const result = this.metaSchemaValidateFunction(data);

    return {
      result,
      errors: this.metaSchemaValidateFunction.errors,
    };
  }

  public validateJsonPatchSchema(data: unknown) {
    const result = this.jsonPatchSchemaValidateFunction(data);

    return {
      result,
      errors: this.jsonPatchSchemaValidateFunction.errors,
    };
  }

  public validateHistoryPatchesSchema(data: unknown) {
    const result = this.historyPatchesSchemaValidate(data);

    return {
      result,
      errors: this.historyPatchesSchemaValidate.errors,
    };
  }

  public async validate(
    data: unknown,
    schema: Schema,
    schemaHash: string,
  ): Promise<{ result: boolean; errors?: null | ErrorObject[] }> {
    const validate = await this.getOrAddValidateFunction(schema, schemaHash);

    const result = validate(data);

    return {
      result,
      errors: validate.errors,
    };
  }

  public getSchemaHash(schema: Schema | Prisma.InputJsonValue): string {
    return hash(schema);
  }

  public async getOrAddValidateFunction(
    schema: Schema | Prisma.InputJsonValue,
    schemaHash: string,
  ): Promise<ValidateFunction> {
    const cachedValidateFunction =
      await this.cacheManager.get<ValidateFunction>(schemaHash);

    if (!cachedValidateFunction) {
      const validateFunction = this.ajv.compile(schema as Schema);
      await this.cacheManager.set(
        schemaHash,
        validateFunction,
        DEFAULT_TIME_EXPIRATION,
      );
      return validateFunction;
    }

    return cachedValidateFunction;
  }

  private compilePluginSchemas(): void {
    this.ajv.compile(ajvRowIdSchema);
    this.ajv.compile(ajvRowCreatedIdSchema);
    this.ajv.compile(ajvRowVersionIdSchema);
    this.ajv.compile(ajvRowCreatedAtSchema);
    this.ajv.compile(ajvRowPublishedAtSchema);
    this.ajv.compile(ajvRowUpdatedAtSchema);
    this.ajv.compile(ajvRowHashSchema);
    this.ajv.compile(ajvRowSchemaHashSchema);
    this.ajv.compile(ajvFileSchema);
  }
}
