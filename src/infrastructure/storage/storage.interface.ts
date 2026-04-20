export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface IStorageService {
  readonly isAvailable: boolean;
  readonly canServeFiles: boolean;
  uploadFile(file: Express.Multer.File, path: string): Promise<{ key: string }>;
  getPublicUrl(key: string): string;
  deleteFile(key: string): Promise<void>;
}
