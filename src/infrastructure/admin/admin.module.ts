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
        const excludedExtensions = /\.(js|css|svg|png|jpg|jpeg)$/;

        if (!excludedExtensions.test(req.baseUrl)) {
          res.setHeader('Cache-Control', 'no-store');
        }

        next();
      })
      .forRoutes('*');
  }
}
