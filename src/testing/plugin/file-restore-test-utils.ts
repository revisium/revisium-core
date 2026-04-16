import { nanoid } from 'nanoid';
import { FileStatus } from 'src/features/plugin/file/consts';

export interface FileTestData {
  status: FileStatus;
  fileId: string;
  url: string;
  fileName: string;
  hash: string;
  extension: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

export interface TestScenario {
  name: string;
  fileData: Partial<FileTestData>;
  expectedError: string;
}

/**
 * Creates valid file data for restore tests
 */
export const createValidFileData = (
  overrides: Partial<FileTestData> = {},
): FileTestData => ({
  status: FileStatus.uploaded,
  fileId: nanoid(),
  url: 'https://example.com/file.jpg',
  fileName: 'test-image.jpg',
  hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', // 64 chars SHA-256
  extension: 'jpg',
  mimeType: 'image/jpeg',
  size: 102400,
  width: 800,
  height: 600,
  ...overrides,
});

/**
 * Creates ready status file data for restore tests
 */
export const createReadyFileData = (
  overrides: Partial<FileTestData> = {},
): FileTestData => ({
  status: FileStatus.ready,
  fileId: nanoid(),
  url: '',
  fileName: '',
  hash: '',
  extension: '',
  mimeType: '',
  size: 0,
  width: 0,
  height: 0,
  ...overrides,
});

/**
 * Test scenarios for validation edge cases
 */
export const validationTestScenarios: TestScenario[] = [
  {
    name: 'missing fileId',
    fileData: { fileId: '' },
    expectedError: 'fileId is required for restore mode',
  },
  {
    name: 'invalid file status',
    fileData: { status: 'invalid_status' as any },
    expectedError: 'Invalid file status: invalid_status',
  },
  {
    name: 'empty hash when provided',
    fileData: { hash: '   ' },
    expectedError: 'hash must be a non-empty string',
  },
  {
    name: 'empty mimeType when provided',
    fileData: { mimeType: '   ' },
    expectedError: 'mimeType must be a non-empty string',
  },
  {
    name: 'mimeType too long',
    fileData: { mimeType: 'a'.repeat(101) },
    expectedError: 'mimeType too long - maximum 100 characters',
  },
  {
    name: 'invalid mimeType format',
    fileData: { mimeType: 'invalid/mime/type/format' },
    expectedError:
      'Invalid mimeType format - must follow RFC 2046 specification',
  },
  {
    name: 'negative size',
    fileData: { size: -1 },
    expectedError: 'size must be a non-negative integer',
  },
  {
    name: 'size too large',
    fileData: { size: Number.MAX_SAFE_INTEGER + 1 },
    expectedError: 'size too large - maximum value exceeded',
  },
  {
    name: 'negative height',
    fileData: { height: -1 },
    expectedError: 'height must be a non-negative integer',
  },
  {
    name: 'height too large',
    fileData: { height: 50001 },
    expectedError: 'height too large - maximum 50000 pixels',
  },
  {
    name: 'width too large',
    fileData: { width: 50001 },
    expectedError: 'width too large - maximum 50000 pixels',
  },
  {
    name: 'invalid extension length',
    fileData: { extension: 'toolongextension' },
    expectedError: 'extension length must be between 1 and 10 characters',
  },
  {
    name: 'invalid extension format',
    fileData: { extension: 'jp-g!' },
    expectedError:
      'Invalid file extension - must be alphanumeric, 1-10 characters',
  },
  {
    name: 'fileName too long',
    fileData: { fileName: 'a'.repeat(256) },
    expectedError: 'fileName too long - maximum 255 characters',
  },
  {
    name: 'fileName with invalid characters',
    fileData: { fileName: 'file<>name.txt' },
    expectedError: 'fileName contains invalid characters',
  },
  {
    name: 'fileName with control characters',
    fileData: { fileName: 'file\x00name.txt' },
    expectedError: 'fileName contains control characters',
  },
  {
    name: 'url too long',
    fileData: { url: 'https://example.com/' + 'a'.repeat(2048) },
    expectedError: 'url too long - maximum 2048 characters',
  },
  {
    name: 'invalid url format',
    fileData: { url: 'invalid-url-format' },
    expectedError: 'Invalid url format',
  },
];

/**
 * Test scenarios for uploaded file consistency validation
 */
export const uploadedFileConsistencyScenarios: TestScenario[] = [
  {
    name: 'uploaded file has zero size',
    fileData: {
      status: FileStatus.uploaded,
      hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      mimeType: 'image/jpeg',
      size: 0,
      width: 100,
      height: 100,
    },
    expectedError: 'size must be greater than 0 when status is uploaded',
  },
  {
    name: 'uploaded file has empty mimeType',
    fileData: {
      status: FileStatus.uploaded,
      hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      mimeType: '',
      size: 1024,
      width: 100,
      height: 100,
    },
    expectedError: 'mimeType is required when status is uploaded',
  },
  {
    name: 'uploaded image with zero dimensions',
    fileData: {
      status: FileStatus.uploaded,
      hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      mimeType: 'image/jpeg',
      size: 1024,
      width: 0,
      height: 0,
    },
    expectedError: 'Image dimensions must be set for uploaded images',
  },
];

/**
 * Creates test data object with file and files arrays
 */
export const createTestData = (
  fileData: FileTestData,
  filesData: FileTestData[] = [],
) => ({
  file: fileData,
  files: filesData,
});

/**
 * Creates a test helper for running validation tests
 */
export const runValidationTest = async (
  testFunction: (data: any, isRestore: boolean) => Promise<any>,
  scenario: TestScenario,
  baseFileData: FileTestData = createReadyFileData(),
) => {
  const fileData = { ...baseFileData, ...scenario.fileData };
  const data = createTestData(fileData);

  await expect(testFunction(data, true)).rejects.toThrow(
    scenario.expectedError,
  );
};
