import { Injectable } from '@nestjs/common';
import { IStorageService } from 'src/infrastructure/storage/storage.interface';

@Injectable()
export class NullStorageService implements IStorageService {
  public get isAvailable(): boolean {
    return false;
  }

  public get canServeFiles(): boolean {
    return false;
  }

  public async uploadFile(): Promise<{ key: string }> {
    throw new Error('Storage is not configured');
  }

  public getPublicUrl(_key: string): string {
    return '';
  }
}
