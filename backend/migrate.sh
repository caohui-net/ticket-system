#!/bin/bash
# 数据库迁移脚本

set -e

echo "=== 数据库迁移开始 ==="
echo ""

# 检查环境变量
if [ ! -f .env ]; then
  echo "❌ 错误: .env 文件不存在"
  exit 1
fi

# 显示当前配置
echo "📋 当前配置:"
source .env
echo "  数据库: $DATABASE_URL"
echo ""

# 生成Prisma Client
echo "1️⃣ 生成 Prisma Client..."
npx prisma generate
echo "✅ Prisma Client 生成完成"
echo ""

# 推送Schema到数据库
echo "2️⃣ 推送 Schema 到数据库..."
npx prisma db push --skip-generate
echo "✅ Schema 推送完成"
echo ""

# 运行种子数据（可选）
read -p "是否运行种子数据脚本? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "3️⃣ 运行种子数据..."
  npm run prisma:seed
  echo "✅ 种子数据完成"
else
  echo "⏭️  跳过种子数据"
fi

echo ""
echo "=== 数据库迁移完成 ==="
echo ""
echo "📊 查看数据库:"
echo "  npx prisma studio"
echo ""
echo "🚀 启动服务:"
echo "  npm run start:dev"
