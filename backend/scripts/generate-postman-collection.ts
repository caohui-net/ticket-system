import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generatePostmanCollection() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('工单管理系统 API')
    .setDescription('工单管理系统后端API文档 - 方案B第一阶段+第二阶段')
    .setVersion('2.0')
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
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 转换为Postman格式
  const postmanCollection: any = {
    info: {
      name: '工单管理系统 API',
      description: document.info.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [],
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{accessToken}}',
          type: 'string',
        },
      ],
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000/api/v1',
        type: 'string',
      },
      {
        key: 'accessToken',
        value: '',
        type: 'string',
      },
    ],
  };

  // 按标签分组
  const itemsByTag: Record<string, any[]> = {};

  // 遍历paths生成请求
  for (const [pathStr, methods] of Object.entries(document.paths)) {
    for (const [method, details] of Object.entries(methods as any)) {
      if (typeof details !== 'object' || !details) continue;

      const detailsObj = details as any;
      const tags = detailsObj.tags || ['default'];
      const tag = tags[0];

      if (!itemsByTag[tag]) {
        itemsByTag[tag] = [];
      }

      // 构建请求URL
      const urlPath = pathStr.replace(/\{([^}]+)\}/g, ':$1');

      const item: any = {
        name: detailsObj.summary || pathStr,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
            },
          ],
          url: {
            raw: `{{baseUrl}}${urlPath}`,
            host: ['{{baseUrl}}'],
            path: urlPath.split('/').filter((p) => p),
          },
        },
        response: [],
      };

      // 添加请求体
      if (detailsObj.requestBody?.content?.['application/json']) {
        const schema = detailsObj.requestBody.content['application/json'].schema;
        const example = detailsObj.requestBody.content['application/json'].example || {};

        item.request.body = {
          mode: 'raw',
          raw: JSON.stringify(example, null, 2),
          options: {
            raw: {
              language: 'json',
            },
          },
        };
      }

      // 添加查询参数
      if (detailsObj.parameters) {
        const queryParams = detailsObj.parameters.filter((p: any) => p.in === 'query');
        if (queryParams.length > 0) {
          item.request.url.query = queryParams.map((p: any) => ({
            key: p.name,
            value: p.example || '',
            description: p.description,
          }));
        }
      }

      itemsByTag[tag].push(item);
    }
  }

  // 构建分组结构
  postmanCollection.item = Object.entries(itemsByTag).map(([tag, items]) => ({
    name: tag,
    item: items,
  }));

  // 保存文件
  const outputPath = path.join(process.cwd(), 'postman-collection.json');
  fs.writeFileSync(outputPath, JSON.stringify(postmanCollection, null, 2));

  console.log(`✅ Postman Collection生成成功: ${outputPath}`);
  console.log(`📦 共生成 ${Object.values(itemsByTag).flat().length} 个API请求`);

  await app.close();
}

generatePostmanCollection().catch((error) => {
  console.error('生成失败:', error);
  process.exit(1);
});
