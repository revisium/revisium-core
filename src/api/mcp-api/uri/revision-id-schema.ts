import { z } from 'zod';

export const revisionIdOrUri = {
  revisionId: z
    .string()
    .optional()
    .describe('Revision ID (UUID). Alternative to uri.'),
  uri: z
    .string()
    .optional()
    .describe(
      'Revisium URI: org/project/branch[:revision] or revisium://host/org/project/branch[:revision]. Revision: "draft" (default), "head", or specific ID. Alternative to revisionId.',
    ),
};

export const draftRevisionIdOrUri = {
  revisionId: z
    .string()
    .optional()
    .describe('Draft revision ID (UUID). Alternative to uri.'),
  uri: z
    .string()
    .optional()
    .describe(
      'Revisium URI: org/project/branch (draft only). Full form also accepted: revisium://host/org/project/branch. Alternative to revisionId.',
    ),
};

export const branchParamsOrUri = {
  organizationId: z
    .string()
    .optional()
    .describe('Organization ID. Alternative to uri.'),
  projectName: z
    .string()
    .optional()
    .describe('Project name. Alternative to uri.'),
  branchName: z
    .string()
    .optional()
    .describe('Branch name. Alternative to uri.'),
  uri: z
    .string()
    .optional()
    .describe(
      'Revisium URI: org/project/branch. Alternative to organizationId/projectName/branchName.',
    ),
};
