#!/bin/bash

# 用户认证模块 - 快速启动脚本
# 请在终端中运行此脚本

set -e  # 遇到错误立即退出

echo "======================================"
echo "工单系统 - 用户认证模块快速启动"
echo "======================================"
echo ""

# 进入backend目录
cd "$(dirname "$0")"
echo "✓ 进入backend目录"

# 检查PostgreSQL
echo ""
echo "检查PostgreSQL连接..."
if ! psql -U postgres -d ticket_system -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✗ 无法连接到PostgreSQL数据库"
    echo "  请确保PostgreSQL正在运行，且数据库ticket_system已创建"
    echo ""
    echo "创建数据库命令:"
    echo "  psql -U postgres -c 'CREATE DATABASE ticket_system;'"
    exit 1
fi
echo "✓ PostgreSQL连接正常"

# 同步数据库Schema
echo ""
echo "同步数据库Schema..."
npx prisma db push
echo "✓ 数据库Schema已同步"

# 初始化种子数据
echo ""
echo "初始化种子数据..."
npm run prisma:seed
echo "✓ 种子数据已初始化"

# 启动服务
echo ""
echo "======================================"
echo "准备完成！正在启动开发服务器..."
echo "======================================"
echo ""
echo "访问地址:"
echo "  应用: http://localhost:3000"
echo "  Swagger文档: http://localhost:3000/api/docs"
echo ""
echo "测试账号 (密码: Password123!):"
echo "  admin (系统管理员)"
echo "  zhangsan (工单创建者)"
echo "  lisi (处理人员)"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

npm run start:dev
