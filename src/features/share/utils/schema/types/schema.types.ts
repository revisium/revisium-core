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
  title?: string;
  description?: string;
  deprecated?: boolean;
  pattern?: string;
  enum?: string[];
  format?: 'date-time' | 'date' | 'time' | 'email' | 'regex';
  contentMediaType?:
    | 'text/plain'
    | 'text/markdown'
    | 'text/html'
    | 'application/json'
    | 'application/schema+json'
    | 'application/yaml';
};

export type JsonNumberSchema = {
  type: JsonSchemaTypeName.Number;
  default: number;
  readOnly?: boolean;
  title?: string;
  description?: string;
  deprecated?: boolean;
};

export type JsonBooleanSchema = {
  type: JsonSchemaTypeName.Boolean;
  default: boolean;
  readOnly?: boolean;
  title?: string;
  description?: string;
  deprecated?: boolean;
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
  title?: string;
  description?: string;
  deprecated?: boolean;
};

export type JsonArraySchema = {
  type: JsonSchemaTypeName.Array;
  items: JsonSchema;
  title?: string;
  description?: string;
  deprecated?: boolean;
};

export type JsonRefSchema = {
  $ref: string;
  title?: string;
  description?: string;
  deprecated?: boolean;
};

export type JsonSchema =
  | JsonObjectSchema
  | JsonArraySchema
  | JsonSchemaPrimitives
  | JsonRefSchema;

export type JsonSchemaWithoutRef =
  | JsonObjectSchema
  | JsonArraySchema
  | JsonSchemaPrimitives;
