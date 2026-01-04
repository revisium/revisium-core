import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorModel } from 'src/api/rest-api/share/model/error.model';

export const ApiCommonErrors = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: 'Invalid request data or validation failed',
      type: ErrorModel,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required. Provide a valid JWT token.',
      type: ErrorModel,
    }),
    ApiForbiddenResponse({
      description: 'Insufficient permissions for this operation',
      type: ErrorModel,
    }),
  );

export const ApiNotFoundError = (resource: string = 'Resource') =>
  applyDecorators(
    ApiNotFoundResponse({
      description: `${resource} not found`,
      type: ErrorModel,
    }),
  );

export const ApiOrganizationIdParam = () =>
  applyDecorators(
    ApiParam({
      name: 'organizationId',
      description: 'Organization identifier (typically the owner username)',
    }),
  );

export const ApiProjectNameParam = () =>
  applyDecorators(
    ApiParam({
      name: 'projectName',
      description:
        'URL-friendly project name (lowercase, numbers, hyphens allowed)',
    }),
  );

export const ApiBranchNameParam = () =>
  applyDecorators(
    ApiParam({
      name: 'branchName',
      description: 'Branch name',
    }),
  );

export const ApiRevisionIdParam = () =>
  applyDecorators(
    ApiParam({
      name: 'revisionId',
      description: 'Revision identifier (any revision: draft, head, or historical)',
    }),
  );

export const ApiDraftRevisionIdParam = () =>
  applyDecorators(
    ApiParam({
      name: 'revisionId',
      description:
        'Draft revision identifier (modifications are only allowed in draft revisions)',
    }),
  );

export const ApiTableIdParam = () =>
  applyDecorators(
    ApiParam({
      name: 'tableId',
      description: 'URL-friendly table identifier',
    }),
  );

export const ApiRowIdParam = () =>
  applyDecorators(
    ApiParam({
      name: 'rowId',
      description: 'URL-friendly row identifier',
    }),
  );

export const ApiEndpointIdParam = () =>
  applyDecorators(
    ApiParam({
      name: 'endpointId',
      description: 'Endpoint identifier',
    }),
  );

export const ApiUserIdParam = () =>
  applyDecorators(
    ApiParam({
      name: 'userId',
      description: 'User identifier',
    }),
  );

export const ApiFileIdParam = () =>
  applyDecorators(
    ApiParam({
      name: 'fileId',
      description: 'File identifier (generated when row was created)',
    }),
  );

export const ApiOrgProjectParams = () =>
  applyDecorators(ApiOrganizationIdParam(), ApiProjectNameParam());

export const ApiOrgProjectBranchParams = () =>
  applyDecorators(
    ApiOrganizationIdParam(),
    ApiProjectNameParam(),
    ApiBranchNameParam(),
  );

export const ApiRevisionTableParams = () =>
  applyDecorators(ApiRevisionIdParam(), ApiTableIdParam());

export const ApiDraftRevisionTableParams = () =>
  applyDecorators(ApiDraftRevisionIdParam(), ApiTableIdParam());

export const ApiRevisionTableRowParams = () =>
  applyDecorators(ApiRevisionIdParam(), ApiTableIdParam(), ApiRowIdParam());

export const ApiDraftRevisionTableRowParams = () =>
  applyDecorators(ApiDraftRevisionIdParam(), ApiTableIdParam(), ApiRowIdParam());
