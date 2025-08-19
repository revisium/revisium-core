import { FileStatus } from 'src/features/plugin/file/consts';
import { validateFileIdUniqueness } from 'src/features/plugin/file/utils/validate-file-id-uniqueness';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';
import { FileValueStore } from '../file-value.store';

/**
 * Validates that fileId is present and not empty
 */
const validateRequiredFileId = (fileId: string | undefined): void => {
  if (!fileId || fileId.trim() === '') {
    throw new Error('fileId is required for restore mode');
  }
};

/**
 * Validates fileId format (nanoid - 21 URL-safe characters)
 */
const validateFileIdFormat = (fileId: string): void => {
  if (!/^[A-Za-z0-9_-]{21}$/.test(fileId)) {
    throw new Error(
      'Invalid fileId format - must be nanoid (21 URL-safe characters)',
    );
  }
};

/**
 * Validates file status against allowed values
 */
const validateFileStatus = (status: unknown): void => {
  if (!Object.values(FileStatus).includes(status as FileStatus)) {
    throw new Error(
      `Invalid file status: ${status}. Allowed values: ${Object.values(FileStatus).join(', ')}`,
    );
  }
};

/**
 * Validates hash format if present (MD5, SHA-1, SHA-256, SHA-512)
 */
const validateHashFormat = (hash: string | undefined): void => {
  if (hash) {
    if (!hash || hash.trim() === '') {
      throw new Error('hash must be a non-empty string');
    }
    if (
      !/^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$|^[a-f0-9]{128}$/.test(hash)
    ) {
      throw new Error(
        'Invalid hash format - must be MD5, SHA-1, SHA-256, or SHA-512',
      );
    }
  }
};

/**
 * Validates MIME type format if present (RFC 2046 specification)
 */
const validateMimeTypeFormat = (mimeType: string | undefined): void => {
  if (mimeType) {
    if (!mimeType || mimeType.trim() === '') {
      throw new Error('mimeType must be a non-empty string');
    }
    if (mimeType.length > 100) {
      throw new Error('mimeType too long - maximum 100 characters');
    }
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.]*$/.test(
        mimeType,
      )
    ) {
      throw new Error(
        'Invalid mimeType format - must follow RFC 2046 specification',
      );
    }
  }
};

/**
 * Validates file size (must be non-negative integer within safe limits)
 */
const validateFileSize = (size: number): void => {
  if (!Number.isInteger(size) || size < 0) {
    throw new Error('size must be a non-negative integer');
  }
  if (size > Number.MAX_SAFE_INTEGER) {
    throw new Error('size too large - maximum value exceeded');
  }
};

/**
 * Validates image width (must be non-negative integer within limits)
 */
const validateImageWidth = (width: number): void => {
  if (!Number.isInteger(width) || width < 0) {
    throw new Error('width must be a non-negative integer');
  }
  if (width > 50000) {
    throw new Error('width too large - maximum 50000 pixels');
  }
};

/**
 * Validates image height (must be non-negative integer within limits)
 */
const validateImageHeight = (height: number): void => {
  if (!Number.isInteger(height) || height < 0) {
    throw new Error('height must be a non-negative integer');
  }
  if (height > 50000) {
    throw new Error('height too large - maximum 50000 pixels');
  }
};

/**
 * Validates file extension format if present
 */
const validateFileExtension = (extension: string | undefined): void => {
  if (extension) {
    if (extension.length === 0 || extension.length > 10) {
      throw new Error('extension length must be between 1 and 10 characters');
    }
    if (!/^[a-zA-Z0-9]{1,10}$/.test(extension)) {
      throw new Error(
        'Invalid file extension - must be alphanumeric, 1-10 characters',
      );
    }
  }
};

/**
 * Validates file name format if present (checks for invalid characters and length)
 */
const validateFileName = (fileName: string | undefined): void => {
  if (fileName !== undefined && fileName !== '') {
    if (fileName.length > 255) {
      throw new Error('fileName too long - maximum 255 characters');
    }

    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(fileName)) {
      throw new Error('fileName contains invalid characters');
    }

    for (let i = 0; i < fileName.length; i++) {
      const code = fileName.charCodeAt(i);
      if ((code >= 0 && code <= 31) || code === 127) {
        throw new Error('fileName contains control characters');
      }
    }
  }
};

/**
 * Validates URL format if present
 */
const validateUrlFormat = (url: string | undefined): void => {
  if (url !== undefined && url !== '') {
    if (url.length > 2048) {
      throw new Error('url too long - maximum 2048 characters');
    }

    try {
      new URL(url);
    } catch {
      throw new Error('Invalid url format');
    }
  }
};

/**
 * Validates data consistency for uploaded files
 */
const validateUploadedFileConsistency = (store: FileValueStore): void => {
  if (store.status === FileStatus.uploaded) {
    if (!store.hash || store.hash.trim() === '') {
      throw new Error('hash is required when status is uploaded');
    }
    if (!store.size || store.size <= 0) {
      throw new Error('size must be greater than 0 when status is uploaded');
    }
    if (!store.mimeType || store.mimeType.trim() === '') {
      throw new Error('mimeType is required when status is uploaded');
    }
  }
};

/**
 * Validates image dimensions consistency
 */
const validateImageDimensionsConsistency = (store: FileValueStore): void => {
  if (store.mimeType && store.mimeType.startsWith('image/')) {
    if (
      store.width === 0 &&
      store.height === 0 &&
      store.status === FileStatus.uploaded
    ) {
      throw new Error('Image dimensions must be set for uploaded images');
    }
  } else {
    if (store.width !== 0 || store.height !== 0) {
      throw new Error('width and height must be 0 for non-image files');
    }
  }
};

/**
 * Validates file data for restore operation
 */
export const validateFileDataForRestore = (
  store: FileValueStore,
  valueStore: JsonValueStore,
): void => {
  validateRequiredFileId(store.fileId);
  validateFileIdFormat(store.fileId!);
  validateFileIdUniqueness(store.fileId!, valueStore);
  validateFileStatus(store.status);
  validateHashFormat(store.hash);
  validateMimeTypeFormat(store.mimeType);
  validateFileSize(store.size);
  validateImageWidth(store.width);
  validateImageHeight(store.height);
  validateFileExtension(store.extension);
  validateFileName(store.fileName);
  validateUrlFormat(store.url);
  validateUploadedFileConsistency(store);
  validateImageDimensionsConsistency(store);
};
