import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { AppModule } from './app.module';
import { requestContextMiddleware } from './common/observability/request-context';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(requestContextMiddleware);

  // 启用CORS
  // 生产环境：从 WEB_BASE_URL 读取允许的来源（支持逗号分隔多个域名，未配置则放开 vercel.app/localhost）
  // 开发环境：放开本地 3000 端口
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = isProd
    ? process.env.WEB_BASE_URL
      ? process.env.WEB_BASE_URL.split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : []
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // 同源请求 / curl / Postman 等没有 Origin 头的请求直接放行
      if (!origin) return callback(null, true);
      // 显式白名单
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // 兜底：允许所有 *.vercel.app 子域，方便 Preview 环境
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // 全局前缀
  app.setGlobalPrefix('api');

  // 静态文件托管:暴露 storage/outputs 与 storage/bgm 等产物目录
  // 前端通过 /static/outputs/creation/<taskId>.mp4 访问最终视频
  const storageRoot = path.resolve(process.cwd(), 'storage');
  app.useStaticAssets(storageRoot, { prefix: '/static/' });

  // Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('VidForge API')
    .setDescription('电商AIGC带货视频生成系统接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger文档: http://localhost:${port}/api/docs`);
}

bootstrap();
