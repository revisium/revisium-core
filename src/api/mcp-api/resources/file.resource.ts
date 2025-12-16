import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { McpResourceRegistrar } from '../types';

export class FileResource implements McpResourceRegistrar {
  private readonly fileRef = SystemSchemaIds.File;

  private readonly emptyFileObject = {
    status: '',
    fileId: '',
    url: '',
    fileName: '',
    hash: '',
    extension: '',
    mimeType: '',
    size: 0,
    width: 0,
    height: 0,
  };

  register(server: McpServer): void {
    server.registerResource(
      'file-specification',
      'revisium://specs/file',
      {
        description: 'Revisium File Schema Specification for file uploads',
        mimeType: 'application/json',
      },
      async () => ({
        contents: [
          {
            uri: 'revisium://specs/file',
            mimeType: 'application/json',
            text: JSON.stringify(this.getSpecification(), null, 2),
          },
        ],
      }),
    );
  }

  private getSpecification() {
    return {
      description:
        'Revisium File Schema Specification. Use this to understand how file fields work in Revisium tables.',

      fileSchemaRef: this.fileRef,
      fileSchema: {
        description: `File fields are defined using $ref: "${this.fileRef}" in table schema`,
        fields: {
          status: {
            type: 'string',
            readOnly: true,
            description: 'File status: "ready", "uploaded", or "error"',
          },
          fileId: {
            type: 'string',
            readOnly: true,
            description:
              'Unique 21-character file identifier generated when row is created',
          },
          url: {
            type: 'string',
            readOnly: true,
            description:
              'Public URL of the file (populated after upload completes)',
          },
          fileName: {
            type: 'string',
            readOnly: false,
            description: 'Original file name (can be updated by user)',
          },
          hash: {
            type: 'string',
            readOnly: true,
            description: 'Content hash of the file (for deduplication)',
          },
          extension: {
            type: 'string',
            readOnly: true,
            description: 'File extension without dot (e.g., "jpg", "pdf")',
          },
          mimeType: {
            type: 'string',
            readOnly: true,
            description: 'MIME type of the file (e.g., "image/jpeg")',
          },
          size: {
            type: 'number',
            readOnly: true,
            description: 'File size in bytes',
          },
          width: {
            type: 'number',
            readOnly: true,
            description: 'Image width in pixels (0 for non-images)',
          },
          height: {
            type: 'number',
            readOnly: true,
            description: 'Image height in pixels (0 for non-images)',
          },
        },
      },

      fileStatuses: {
        ready: {
          description:
            'File field created, waiting for upload. This is the initial state.',
          canUpload: true,
        },
        uploaded: {
          description:
            'File successfully uploaded and stored. URL is now available.',
          canUpload: false,
        },
        error: {
          description: 'Upload or processing failed.',
          canUpload: false,
        },
      },

      tableSchemaExamples: {
        singleFile: {
          description: 'Table with a single file field',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', default: '' },
              document: {
                $ref: this.fileRef,
                description: 'Attached document',
              },
            },
            additionalProperties: false,
            required: ['title', 'document'],
          },
        },
        multipleFiles: {
          description: 'Table with array of files',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', default: '' },
              images: {
                type: 'array',
                items: { $ref: this.fileRef },
                description: 'Gallery images',
              },
            },
            additionalProperties: false,
            required: ['title', 'images'],
          },
        },
        mixedContent: {
          description: 'Table with various content types including files',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: '' },
              description: {
                type: 'string',
                default: '',
                contentMediaType: 'text/markdown',
              },
              avatar: { $ref: this.fileRef, description: 'Profile picture' },
              attachments: {
                type: 'array',
                items: { $ref: this.fileRef },
                description: 'Additional attachments',
              },
            },
            additionalProperties: false,
            required: ['name', 'description', 'avatar', 'attachments'],
          },
        },
      },

      uploadWorkflow: {
        description: 'Step-by-step workflow for uploading files',
        steps: [
          {
            step: 1,
            action: 'Create table with file field',
            example: `createTable with schema containing { $ref: "${this.fileRef}" } property`,
          },
          {
            step: 2,
            action: 'Create row',
            note: 'File field will be initialized with status="ready" and generated fileId',
            example:
              'createRow - the file field gets auto-populated with ready status',
          },
          {
            step: 3,
            action: 'Get row to find fileId',
            example: 'getRow returns row.data with file.fileId',
          },
          {
            step: 4,
            action: 'Upload file data',
            example:
              'uploadFile(revisionId, tableId, rowId, fileId, fileName, mimeType, base64Data)',
          },
          {
            step: 5,
            action: 'Verify upload',
            example: 'getRow now shows status="uploaded" and populated url',
          },
        ],
      },

      uploadWorkflowExample: {
        description: 'Complete example of creating and uploading a file',
        steps: [
          {
            tool: 'createTable',
            params: {
              revisionId: 'draft-123',
              tableId: 'documents',
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', default: '' },
                  file: { $ref: this.fileRef },
                },
                additionalProperties: false,
                required: ['title', 'file'],
              },
            },
          },
          {
            tool: 'createRow',
            params: {
              revisionId: 'draft-123',
              tableId: 'documents',
              rowId: 'doc-1',
              data: {
                title: 'My Document',
                file: { ...this.emptyFileObject },
              },
            },
            note: 'IMPORTANT: Provide file object with empty defaults. Backend auto-generates status="ready" and fileId. The response contains row.data with generated fileId.',
          },
          {
            tool: 'getRow',
            params: {
              revisionId: 'draft-123',
              tableId: 'documents',
              rowId: 'doc-1',
            },
            result: {
              data: {
                title: 'My Document',
                file: {
                  status: 'ready',
                  fileId: 'abc123def456ghi789jkl',
                  url: '',
                  fileName: '',
                  hash: '',
                  extension: '',
                  mimeType: '',
                  size: 0,
                  width: 0,
                  height: 0,
                },
              },
            },
          },
          {
            tool: 'uploadFile',
            params: {
              revisionId: 'draft-123',
              tableId: 'documents',
              rowId: 'doc-1',
              fileId: 'abc123def456ghi789jkl',
              fileName: 'report.pdf',
              mimeType: 'application/pdf',
              fileData: '<base64-encoded-content>',
            },
          },
          {
            tool: 'getRow',
            params: {
              revisionId: 'draft-123',
              tableId: 'documents',
              rowId: 'doc-1',
            },
            result: {
              data: {
                title: 'My Document',
                file: {
                  status: 'uploaded',
                  fileId: 'abc123def456ghi789jkl',
                  url: 'https://cdn.example.com/abc123def...',
                  fileName: 'report.pdf',
                  hash: 'a1b2c3d4e5...',
                  extension: 'pdf',
                  mimeType: 'application/pdf',
                  size: 102400,
                  width: 0,
                  height: 0,
                },
              },
            },
          },
        ],
      },

      arrayUploadExample: {
        description: 'Uploading multiple files to an array field',
        steps: [
          {
            step: 1,
            action: 'Create row with file array containing file objects',
            note: 'Provide array with full file objects (empty defaults). Each gets unique fileId.',
            example: {
              data: {
                name: 'My Gallery',
                images: [
                  { ...this.emptyFileObject },
                  { ...this.emptyFileObject },
                ],
              },
            },
          },
          {
            step: 2,
            action: 'Get row to find fileIds',
            note: 'Each array element now has its own fileId with status="ready"',
          },
          {
            step: 3,
            action: 'Upload to each fileId',
            note: 'Call uploadFile for images[0].fileId, images[1].fileId, etc.',
          },
        ],
        alternativeMethod: {
          description:
            'You can also create row with empty array and add files later using patchRow',
          steps: [
            'Create row with images: []',
            'Use patchRow to replace images with array of empty file objects',
            'Get row to find generated fileIds',
            'Upload files',
          ],
        },
      },

      arrayUploadWorkflowExample: {
        description:
          'Complete example of creating and uploading multiple files to array field',
        steps: [
          {
            tool: 'createTable',
            params: {
              revisionId: 'draft-123',
              tableId: 'galleries',
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: '' },
                  images: {
                    type: 'array',
                    items: { $ref: this.fileRef },
                    description: 'Gallery images',
                  },
                },
                additionalProperties: false,
                required: ['name', 'images'],
              },
            },
          },
          {
            tool: 'createRow',
            params: {
              revisionId: 'draft-123',
              tableId: 'galleries',
              rowId: 'gallery-1',
              data: {
                name: 'My Gallery',
                images: [
                  { ...this.emptyFileObject },
                  { ...this.emptyFileObject },
                ],
              },
            },
            note: 'IMPORTANT: Provide array with full file objects. Backend auto-generates fileIds. The response contains row.data with generated fileIds - no need for separate getRow.',
          },
          {
            tool: 'getRow (optional)',
            params: {
              revisionId: 'draft-123',
              tableId: 'galleries',
              rowId: 'gallery-1',
            },
            result: {
              data: {
                name: 'My Gallery',
                images: [
                  {
                    ...this.emptyFileObject,
                    status: 'ready',
                    fileId: 'abc123def456ghi789jkl',
                  },
                  {
                    ...this.emptyFileObject,
                    status: 'ready',
                    fileId: 'xyz789uvw456rst123mno',
                  },
                ],
              },
            },
            note: 'Optional - fileIds are already in createRow response. Each element has unique fileId with status="ready"',
          },
          {
            tool: 'uploadFile',
            params: {
              revisionId: 'draft-123',
              tableId: 'galleries',
              rowId: 'gallery-1',
              fileId: 'abc123def456ghi789jkl',
              fileName: 'photo1.jpg',
              mimeType: 'image/jpeg',
              fileData: '<base64-encoded-content>',
            },
            note: 'Upload first image using images[0].fileId',
          },
          {
            tool: 'uploadFile',
            params: {
              revisionId: 'draft-123',
              tableId: 'galleries',
              rowId: 'gallery-1',
              fileId: 'xyz789uvw456rst123mno',
              fileName: 'photo2.png',
              mimeType: 'image/png',
              fileData: '<base64-encoded-content>',
            },
            note: 'Upload second image using images[1].fileId',
          },
          {
            tool: 'getRow',
            params: {
              revisionId: 'draft-123',
              tableId: 'galleries',
              rowId: 'gallery-1',
            },
            result: {
              data: {
                name: 'My Gallery',
                images: [
                  {
                    status: 'uploaded',
                    fileId: 'abc123def456ghi789jkl',
                    url: 'https://cdn.example.com/abc123...',
                    fileName: 'photo1.jpg',
                    hash: 'hash1...',
                    extension: 'jpg',
                    mimeType: 'image/jpeg',
                    size: 245000,
                    width: 1920,
                    height: 1080,
                  },
                  {
                    status: 'uploaded',
                    fileId: 'xyz789uvw456rst123mno',
                    url: 'https://cdn.example.com/xyz789...',
                    fileName: 'photo2.png',
                    hash: 'hash2...',
                    extension: 'png',
                    mimeType: 'image/png',
                    size: 180000,
                    width: 800,
                    height: 600,
                  },
                ],
              },
            },
            note: 'Both images now have status="uploaded" with URLs and dimensions',
          },
        ],
      },

      queryingFiles: {
        description: 'How to filter and sort rows by file properties',
        examples: {
          filterByStatus: {
            description: 'Find all rows with uploaded files',
            where: { data: { path: 'document.status', equals: 'uploaded' } },
          },
          filterByExtension: {
            description: 'Find all PDF documents',
            where: { data: { path: 'document.extension', equals: 'pdf' } },
          },
          filterByMimeType: {
            description: 'Find all images',
            where: {
              data: { path: 'avatar.mimeType', string_starts_with: 'image/' },
            },
          },
          filterBySize: {
            description: 'Find files larger than 1MB',
            where: { data: { path: 'document.size', gt: 1048576 } },
          },
          filterByDimensions: {
            description: 'Find images wider than 1920px',
            where: { data: { path: 'image.width', gt: 1920 } },
          },
          filterImagesByAspectRatio: {
            description: 'Find landscape images (width > height)',
            note: 'Use multiple filters',
            where: {
              AND: [
                { data: { path: 'image.width', gt: 0 } },
                { data: { path: 'image.height', gt: 0 } },
              ],
            },
            note2:
              'Aspect ratio comparison requires application-level filtering',
          },
          filterArrayFiles: {
            description: 'Find rows where any attachment is a PDF',
            where: {
              data: { path: 'attachments[*].extension', equals: 'pdf' },
            },
          },
          sortBySize: {
            description: 'Sort by file size',
            orderBy: {
              data: { path: 'document.size', direction: 'desc', type: 'int' },
            },
          },
          sortByFileName: {
            description: 'Sort alphabetically by file name',
            orderBy: {
              data: {
                path: 'document.fileName',
                direction: 'asc',
                type: 'text',
              },
            },
          },
        },
      },

      rules: [
        'IMPORTANT: When creating a row with file fields, provide the full file object with empty/default values (see createRowFileStructure)',
        'The backend automatically initializes file fields with status="ready" and a unique fileId',
        'Each file field gets a unique 21-character fileId upon creation',
        'Use uploadFile tool with the fileId to upload actual file content',
        'After upload, status changes to "uploaded" and URL becomes available',
        'Files with status "uploaded" cannot be re-uploaded (immutable)',
        'Only fileName can be updated on uploaded files',
        'Maximum file size is 50MB',
        'For image files, width and height are automatically extracted',
        'File content is stored in S3 and deduplicated by hash',
      ],
      createRowFileStructure: {
        description:
          'When creating a row with file fields, you MUST provide the full file object structure with empty/default values. The backend will auto-generate status and fileId. The response from createRow contains the row with generated fileIds.',
        emptyFileObject: this.emptyFileObject,
        example: {
          note: 'Creating a row with a file field',
          data: {
            title: 'My Document',
            document: { ...this.emptyFileObject },
          },
        },
        arrayExample: {
          note: 'Creating a row with array of files',
          data: {
            name: 'My Gallery',
            images: [{ ...this.emptyFileObject }, { ...this.emptyFileObject }],
          },
        },
      },

      limitations: [
        'File content cannot be modified after upload - create new file instead',
        'Self-referencing file arrays require careful handling',
        'Large files should be uploaded in chunks (not supported via MCP yet)',
        'Only base64 encoding is supported for MCP uploads',
      ],
    };
  }
}
