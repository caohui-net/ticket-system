#!/bin/bash
set -e

echo "================================"
echo "🚀 开始数据库迁移..."
echo "================================"

# 检查数据库连接
echo "📡 检查数据库连接..."
if ! npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo "❌ 数据库连接失败，请检查 DATABASE_URL 配置"
    exit 1
fi
echo "✅ 数据库连接成功"

# 生成Prisma Client
echo ""
echo "📦 生成 Prisma Client..."
npx prisma generate
echo "✅ Prisma Client 生成完成"

# 应用数据库迁移
echo ""
echo "🔄 应用数据库迁移..."
npx prisma db push --skip-generate
echo "✅ 数据库迁移完成"

# 初始化种子数据（根据环境变量决定）
if [ "$INIT_SEED_DATA" = "true" ]; then
    echo ""
    echo "🌱 初始化种子数据..."

    # 检查种子脚本是否存在
    if [ -f "src/modules/approval/seeds/roles-phase1.seed.ts" ]; then
        npx ts-node src/modules/approval/seeds/roles-phase1.seed.ts
        echo "✅ 角色权限种子数据初始化完成"
    else
        echo "⚠️  种子脚本不存在，跳过..."
    fi
else
    echo ""
    echo "ℹ️  跳过种子数据初始化（设置 INIT_SEED_DATA=true 来启用）"
fi

echo ""
echo "================================"
echo "✅ 数据库部署完成！"
echo "================================"
