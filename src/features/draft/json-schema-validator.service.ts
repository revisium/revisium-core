import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Ajv, { ErrorObject, Schema, ValidateFunction } from 'ajv/dist/2020';
import * as hash from 'object-hash';
import { CustomSchemeKeywords } from 'src/features/share/schema/consts';
import { jsonPatchSchema } from 'src/features/share/schema/json-patch-schema';
import { metaSchema } from 'src/features/share/schema/meta-schema';

// TODO add to config
const DEFAULT_TIME_EXPIRATION = 24 * 60 * 60 * 1000;

// TODO moved to separate module to have an independent cache
@Injectable()
export class JsonSchemaValidatorService {
  private readonly ajv = new Ajv();

  private readonly metaSchemaValidate: ValidateFunction;
  private readonly jsonPatchSchemaValidate: ValidateFunction;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    this.ajv.addKeyword({
      keyword: CustomSchemeKeywords.Reference,
      type: 'string',
    });

    this.metaSchemaValidate = this.ajv.compile(metaSchema);
    this.jsonPatchSchemaValidate = this.ajv.compile(jsonPatchSchema);
  }

  public validateMetaSchema(data: unknown) {
    const result = this.metaSchemaValidate(data);

    return {
      result,
      errors: this.metaSchemaValidate.errors,
    };
  }

  public validateJsonPatchSchema(data: unknown) {
    const result = this.jsonPatchSchemaValidate(data);

    return {
      result,
      errors: this.jsonPatchSchemaValidate.errors,
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
    // TODO getting hash from DB
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
}
