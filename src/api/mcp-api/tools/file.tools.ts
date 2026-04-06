import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { CoreEngineApiService } from 'src/core/core-engine-api.service';
import { McpAuthHelpers, McpToolRegistrar } from '../types';
import {
  UriRevisionResolver,
  resolveRevisionId,
  draftRevisionIdOrUri,
} from '../uri';

export class FileTools implements McpToolRegistrar {
  constructor(
    private readonly engine: CoreEngineApiService,
    private readonly uriResolver: UriRevisionResolver,
  ) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'upload_file',
      {
        description: `Upload a file to a row's file field using base64 data. Requires storage to be configured (S3 or local provider via FILE_PLUGIN_PROVIDER env var).
WORKFLOW:
1. Create a table with a file field using $ref: "urn:jsonschema:io:revisium:file-schema:1.0.0" in schema
2. Create a row - the file field will have status "ready" and a generated fileId
3. Get the row (get_row) to find the auto-generated fileId in the file field
4. Use this tool to upload the actual file data using that fileId
5. After upload, status changes to "uploaded" and url becomes available

For arrays of files: each array element has its own fileId, upload files one by one.
If you get "Storage is not configured" error, the server needs S3 or local storage provider configured.`,
        inputSchema: {
          ...draftRevisionIdOrUri,
          tableId: z.string().describe('Table ID'),
          rowId: z.string().describe('Row ID'),
          fileId: z
            .string()
            .describe(
              'File ID from the row data (21-character ID generated when row was created)',
            ),
          fileName: z
            .string()
            .describe('Original file name with extension (e.g., "photo.jpg")'),
          mimeType: z
            .string()
            .describe('MIME type of the file (e.g., "image/jpeg")'),
          fileData: z
            .string()
            .describe(
              'Base64-encoded file content. Max size: 50MB after decoding.',
            ),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({
        revisionId: rawRevisionId,
        uri,
        tableId,
        rowId,
        fileId,
        fileName,
        mimeType,
        fileData,
      }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
          { mutation: true },
        );
        await auth.checkPermissionByRevision(
          revisionId,
          [{ action: PermissionAction.update, subject: PermissionSubject.Row }],
          auth.userId,
        );

        const buffer = Buffer.from(fileData, 'base64');

        const maxSize = 1024 * 1024 * 50;
        if (buffer.length > maxSize) {
          throw new Error(
            `File size ${buffer.length} bytes exceeds maximum allowed size of ${maxSize} bytes (50MB)`,
          );
        }

        const file: Express.Multer.File = {
          fieldname: 'file',
          originalname: fileName,
          encoding: '7bit',
          mimetype: mimeType,
          buffer,
          size: buffer.length,
          stream: null as never,
          destination: '',
          filename: '',
          path: '',
        };

        const result = await this.engine.uploadFile({
          revisionId,
          tableId,
          rowId,
          fileId,
          file,
        });

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );
  }
}
