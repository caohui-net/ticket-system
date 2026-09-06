#!/bin/bash

# 通知系统部署验证脚本

echo "==================================="
echo "通知系统部署验证"
echo "==================================="
echo ""

# 1. 检查依赖安装
echo "1. 检查依赖包..."
if npm list nodemailer ioredis > /dev/null 2>&1; then
    echo "✓ 依赖包已安装"
else
    echo "✗ 依赖包缺失，正在安装..."
    npm install nodemailer ioredis @types/nodemailer
fi
echo ""

# 2. 检查环境变量
echo "2. 检查环境变量..."
if grep -q "SMTP_HOST" .env; then
    echo "✓ SMTP配置已存在"
else
    echo "⚠ SMTP配置未设置，邮件功能将被禁用"
    echo "  请在.env中添加以下配置："
    echo "  SMTP_HOST=smtp.gmail.com"
    echo "  SMTP_PORT=587"
    echo "  SMTP_USER=your-email@gmail.com"
    echo "  SMTP_PASS=your-app-password"
    echo "  SMTP_FROM=noreply@ticketing.com"
fi
echo ""

# 3. 检查数据库迁移
echo "3. 检查数据库迁移..."
if [ -d "prisma/migrations" ]; then
    echo "✓ 数据库迁移文件已存在"
    echo "  请运行以下命令应用迁移："
    echo "  npx prisma migrate deploy"
else
    echo "⚠ 迁移文件不存在"
fi
echo ""

# 4. 编译检查
echo "4. 编译检查..."
if npm run build > /dev/null 2>&1; then
    echo "✓ 编译成功"
else
    echo "✗ 编译失败，请检查错误"
    npm run build
    exit 1
fi
echo ""

# 5. 运行测试
echo "5. 运行测试..."
if npm test -- notification.service.spec.ts > /dev/null 2>&1; then
    echo "✓ 通知服务测试通过"
else
    echo "✗ 测试失败"
    npm test -- notification.service.spec.ts
    exit 1
fi
echo ""

# 6. 检查API端点
echo "6. 通知系统API端点："
echo "  GET    /api/v1/notifications"
echo "  GET    /api/v1/notifications/unread-count"
echo "  PATCH  /api/v1/notifications/:id/read"
echo "  PATCH  /api/v1/notifications/read-all"
echo "  DELETE /api/v1/notifications/:id"
echo "  GET    /api/v1/notification-settings"
echo "  PUT    /api/v1/notification-settings"
echo ""

# 7. 检查Swagger文档
echo "7. Swagger API文档："
echo "  启动服务后访问: http://localhost:3000/api-docs"
echo ""

echo "==================================="
echo "验证完成！"
echo "==================================="
echo ""
echo "下一步："
echo "1. 应用数据库迁移: npx prisma migrate deploy"
echo "2. 配置SMTP邮件服务器（可选）"
echo "3. 启动服务: npm run start:dev"
echo "4. 访问Swagger文档测试API"
echo ""
