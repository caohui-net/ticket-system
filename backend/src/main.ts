import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局前缀
  app.setGlobalPrefix('api');

  // 启用CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // 安全中间件
  app.use(helmet());

  // 响应压缩
  app.use(compression());

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('工单管理系统 API')
    .setDescription('工单管理系统后端接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('认证', '用户认证相关接口')
    .addTag('用户', '用户管理相关接口')
    .addTag('工单', '工单管理相关接口')
    .addTag('分配', '工单分配相关接口')
    .addTag('处理', '工单处理相关接口')
    .addTag('审核', '工单审核相关接口')
    .addTag('通知', '通知相关接口')
    .addTag('报表', '统计报表相关接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n🚀 应用启动成功！`);
  console.log(`📍 接口地址: http://localhost:${port}/api`);
  console.log(`📚 API文档: http://localhost:${port}/api/docs\n`);
}

bootstrap();
