import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ServeStaticModule,
  ServeStaticModuleOptions,
} from '@nestjs/serve-static';
import { Request, Response, NextFunction } from 'express';
import { AdminModuleOptions } from 'src/infrastructure/admin/admin-module.options';
import { EnvJsController } from 'src/infrastructure/admin/envjs.controller';

@Module({
  controllers: [EnvJsController],
})
export class AdminModule implements NestModule {
  static forRoot(options: AdminModuleOptions): DynamicModule {
    const serveStaticOptions: ServeStaticModuleOptions = {
      rootPath: options.rootPath,
      serveStaticOptions: {
        cacheControl: true,
        maxAge: '1y',
        immutable: true,
      },
    };

    return {
      module: AdminModule,
      imports: [ConfigModule, ServeStaticModule.forRoot(serveStaticOptions)],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: Request, res: Response, next: NextFunction) => {
        // Static assets with hash in filename get long cache
        const staticAssets =
          /\.(js|css|woff|woff2|ttf|eot|ico|svg|png|jpg|jpeg|gif|webp|avif|wasm)$/;

        if (staticAssets.test(req.baseUrl)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          // HTML and other files should not be cached
          res.setHeader('Cache-Control', 'no-store');
        }

        next();
      })
      .forRoutes('*');
  }
}
