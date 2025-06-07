import { JsonValue } from './json.types';

export type JsonValuePatchMove = { op: 'move'; from: string; path: string };
export type JsonValuePatchReplace = {
  op: 'replace';
  path: string;
  value: JsonValue;
};
export type JsonValuePatchRemove = { op: 'remove'; path: string };
export type JsonValuePatchAdd = { op: 'add'; path: string; value: JsonValue };

export type JsonValuePatch =
  | JsonValuePatchMove
  | JsonValuePatchReplace
  | JsonValuePatchRemove
  | JsonValuePatchAdd;
