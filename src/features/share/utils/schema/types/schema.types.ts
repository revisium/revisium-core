export enum JsonSchemaTypeName {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}

export type JsonStringSchema = {
  type: JsonSchemaTypeName.String;
  default: string;
  foreignKey?: string;
  readOnly?: boolean;
};

export type JsonNumberSchema = {
  type: JsonSchemaTypeName.Number;
  default: number;
  readOnly?: boolean;
};

export type JsonBooleanSchema = {
  type: JsonSchemaTypeName.Boolean;
  default: boolean;
  readOnly?: boolean;
};

export type JsonSchemaPrimitives =
  | JsonStringSchema
  | JsonNumberSchema
  | JsonBooleanSchema;

export type JsonObjectSchema = {
  type: JsonSchemaTypeName.Object;
  additionalProperties: false;
  required: string[];
  properties: Record<string, JsonSchema>;
};

export type JsonArraySchema = {
  type: JsonSchemaTypeName.Array;
  items: JsonSchema;
};

export type JsonRefSchema = {
  $ref: string;
};

export type JsonSchema =
  | JsonObjectSchema
  | JsonArraySchema
  | JsonSchemaPrimitives
  | JsonRefSchema;
