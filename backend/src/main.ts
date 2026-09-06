import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局前缀 (健康检查路径排除)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/db', 'health/redis', 'health/all'],
  });

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

  // CORS配置
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('工单管理系统 API')
    .setDescription('工单管理系统后端API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('健康检查', '系统健康状态检查接口')
    .addTag('认证模块', '用户认证相关接口')
    .addTag('用户模块', '用户管理相关接口')
    .addTag('工单模块', '工单管理相关接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
