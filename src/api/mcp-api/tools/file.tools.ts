import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class FileTools implements McpToolRegistrar {
  constructor(private readonly draftApi: DraftApiService) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'upload_file',
      {
        description: `Upload a file to a row's file field using base64 data.
WORKFLOW:
1. Create a table with a file field using $ref: "File" in schema
2. Create a row - the file field will have status "ready" and a generated fileId
3. Get the row to find the fileId in the file field
4. Use this tool to upload the actual file data using that fileId
5. After upload, status changes to "uploaded" and url becomes available

For arrays of files: each array element has its own fileId, upload files one by one.`,
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
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
        revisionId,
        tableId,
        rowId,
        fileId,
        fileName,
        mimeType,
        fileData,
      }) => {
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

        const result = await this.draftApi.apiUploadFile({
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
