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
    .setDescription('工单管理系统后端API文档 - 方案B第一阶段+第二阶段')
    .setVersion('2.0')
    .addTag('auth', '认证相关')
    .addTag('tickets', '工单管理')
    .addTag('approval', '审批流程')
    .addTag('budget', '预算管理')
    .addTag('project', '立项管理')
    .addTag('visa', '签证管理')
    .addTag('settlement', '结算管理')
    .addTag('logs', '日志管理')
    .addTag('attachments', '附件管理')
    .addTag('statistics', '统计报表')
    .addTag('permissions', '权限管理')
    .addTag('notifications', '通知管理')
    .addTag('health', '健康检查')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer('http://localhost:3000', '本地开发环境')
    .addServer('https://api.yourdomain.com', '生产环境')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: '工单系统 API 文档',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger UI: ${await app.getUrl()}/api/docs`);
}

bootstrap();
