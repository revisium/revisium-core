import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { LocalStorageService } from 'src/infrastructure/storage/local-storage.service';
import {
  IStorageService,
  STORAGE_SERVICE,
} from 'src/infrastructure/storage/storage.interface';

@Controller('files')
export class StorageController {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  @Get(':key')
  public async getFile(
    @Param('key') key: string,
    @Res() res: Response,
  ): Promise<void> {
    if (
      !this.storageService.canServeFiles ||
      !(this.storageService instanceof LocalStorageService)
    ) {
      throw new NotFoundException();
    }

    if (key.includes('..') || key.includes('/') || key.includes('\\')) {
      throw new NotFoundException();
    }

    const result = await this.storageService.readFile(key);
    if (!result) {
      throw new NotFoundException();
    }

    res.set({
      'Content-Type': result.contentType,
      'Content-Length': result.buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    res.send(result.buffer);
  }
}
