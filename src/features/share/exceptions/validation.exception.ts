import { BadRequestException } from '@nestjs/common';

export interface ValidationErrorDetail {
  path: string;
  message: string;
}

export interface ForeignKeyErrorDetail {
  path: string;
  tableId: string;
  missingRowIds: string[];
}

export interface ValidationErrorContext {
  tableId: string;
  rowId?: string;
}

export interface ValidationErrorResponse {
  code: string;
  message: string;
  context?: ValidationErrorContext;
  details: ValidationErrorDetail[];
}

export interface ForeignKeyErrorResponse {
  code: string;
  message: string;
  context?: ValidationErrorContext;
  details: ForeignKeyErrorDetail[];
}

export const ValidationErrorCode = {
  INVALID_DATA: 'INVALID_DATA',
  FOREIGN_KEY_NOT_FOUND: 'FOREIGN_KEY_NOT_FOUND',
  TABLE_NOT_FOUND: 'TABLE_NOT_FOUND',
} as const;

export class DataValidationException extends BadRequestException {
  constructor(
    details: ValidationErrorDetail[],
    context?: ValidationErrorContext,
  ) {
    const response: ValidationErrorResponse = {
      code: ValidationErrorCode.INVALID_DATA,
      message: DataValidationException.formatMessage(details, context),
      context,
      details,
    };

    super(response);
  }

  private static formatMessage(
    details: ValidationErrorDetail[],
    context?: ValidationErrorContext,
  ): string {
    const contextStr = context
      ? ` in table "${context.tableId}"${context.rowId ? ` for row "${context.rowId}"` : ''}`
      : '';

    if (details.length === 0) {
      return `Data validation failed${contextStr}`;
    }

    if (details.length === 1) {
      return `Validation error at "${details[0].path}"${contextStr}: ${details[0].message}`;
    }

    return `Validation failed with ${details.length} errors${contextStr}`;
  }

  getDetails(): ValidationErrorDetail[] {
    const response = this.getResponse() as ValidationErrorResponse;
    return response.details;
  }

  getContext(): ValidationErrorContext | undefined {
    const response = this.getResponse() as ValidationErrorResponse;
    return response.context;
  }
}

export class ForeignKeyTableNotFoundException extends BadRequestException {
  constructor(
    referencedTableId: string,
    context?: ValidationErrorContext,
    path?: string,
  ) {
    const contextStr = context
      ? ` (in table "${context.tableId}"${context.rowId ? `, row "${context.rowId}"` : ''})`
      : '';
    const message = path
      ? `Referenced table "${referencedTableId}" at path "${path}" does not exist in the revision${contextStr}`
      : `Referenced table "${referencedTableId}" does not exist in the revision${contextStr}`;

    super({
      code: ValidationErrorCode.TABLE_NOT_FOUND,
      message,
      referencedTableId,
      context,
      path,
    });
  }
}

export class ForeignKeyRowsNotFoundException extends BadRequestException {
  constructor(
    details: ForeignKeyErrorDetail[],
    context?: ValidationErrorContext,
  ) {
    const response: ForeignKeyErrorResponse = {
      code: ValidationErrorCode.FOREIGN_KEY_NOT_FOUND,
      message: ForeignKeyRowsNotFoundException.formatMessage(details, context),
      context,
      details,
    };

    super(response);
  }

  private static formatMessage(
    details: ForeignKeyErrorDetail[],
    context?: ValidationErrorContext,
  ): string {
    const contextStr = context
      ? ` in table "${context.tableId}"${context.rowId ? ` for row "${context.rowId}"` : ''}`
      : '';

    if (details.length === 0) {
      return `Foreign key validation failed${contextStr}`;
    }

    if (details.length === 1) {
      const detail = details[0];
      const rowCount = detail.missingRowIds.length;
      const rowsStr =
        rowCount === 1
          ? `"${detail.missingRowIds[0]}"`
          : `${rowCount} rows (${detail.missingRowIds
              .slice(0, 3)
              .map((r) => `"${r}"`)
              .join(', ')}${rowCount > 3 ? '...' : ''})`;
      return `Foreign key error at "${detail.path}"${contextStr}: ${rowsStr} not found in table "${detail.tableId}"`;
    }

    return `Foreign key validation failed: ${details.length} references not found${contextStr}`;
  }

  getDetails(): ForeignKeyErrorDetail[] {
    const response = this.getResponse() as ForeignKeyErrorResponse;
    return response.details;
  }

  getContext(): ValidationErrorContext | undefined {
    const response = this.getResponse() as ForeignKeyErrorResponse;
    return response.context;
  }
}
