#!/bin/bash

# 生产环境部署脚本
# 自动检查、构建并启动工单系统

set -e

echo "================================"
echo "🚀 工单系统生产环境部署"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker
echo "📦 检查Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker已安装: $(docker --version)${NC}"

# 检查Docker Compose
echo "📦 检查Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose已安装: $(docker-compose --version)${NC}"
echo ""

# 检查.env文件
echo "🔍 检查环境配置..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env文件不存在，从模板创建...${NC}"
    if [ -f .env.production ]; then
        cp .env.production .env
        echo -e "${YELLOW}⚠️  请编辑 .env 文件，修改必要的配置（JWT_SECRET等）${NC}"
        echo ""
        read -p "按Enter继续，或Ctrl+C退出修改配置..."
    else
        echo -e "${RED}❌ .env.production模板文件不存在${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env文件存在${NC}"
fi

# 检查必需的环境变量
echo "🔑 检查关键配置..."
source .env

if [ "$JWT_SECRET" = "your_super_secret_jwt_key_change_this_in_production_min_32_chars" ]; then
    echo -e "${RED}❌ JWT_SECRET未修改，请设置安全的密钥${NC}"
    exit 1
fi

if [ "$DB_PASSWORD" = "your_secure_password_change_this" ]; then
    echo -e "${RED}❌ DB_PASSWORD未修改，请设置安全的数据库密码${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 关键配置已设置${NC}"
echo ""

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose down 2>/dev/null || true
echo ""

# 清理旧数据（可选）
read -p "是否清理旧数据（数据库和Redis）？这将删除所有数据！(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  清理数据卷...${NC}"
    docker-compose down -v
    echo -e "${GREEN}✅ 数据卷已清理${NC}"
fi
echo ""

# 构建镜像
echo "🔨 构建Docker镜像..."
docker-compose build --no-cache backend
echo -e "${GREEN}✅ 镜像构建完成${NC}"
echo ""

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d
echo ""

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps
echo ""

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
timeout=60
counter=0
until docker-compose exec -T postgres pg_isready -U ${DB_USER:-ticketuser} > /dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ 数据库启动超时${NC}"
        docker-compose logs postgres
        exit 1
    fi
    echo -n "."
done
echo ""
echo -e "${GREEN}✅ 数据库已就绪${NC}"
echo ""

# 执行数据库迁移
echo "🔄 执行数据库迁移..."
docker-compose exec backend npx prisma db push
echo -e "${GREEN}✅ 数据库迁移完成${NC}"
echo ""

# 初始化种子数据
read -p "是否初始化种子数据（角色权限）？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 初始化种子数据..."
    docker-compose exec backend npx ts-node src/modules/approval/seeds/roles-phase1.seed.ts || {
        echo -e "${YELLOW}⚠️  种子数据初始化失败，可以稍后手动执行${NC}"
    }
    echo -e "${GREEN}✅ 种子数据初始化完成${NC}"
fi
echo ""

# 健康检查
echo "🏥 执行健康检查..."
sleep 5

# 检查后端健康
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务健康${NC}"
else
    echo -e "${RED}❌ 后端服务异常${NC}"
    docker-compose logs --tail=50 backend
    exit 1
fi

# 检查数据库健康
if curl -f http://localhost:3000/health/db > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 数据库连接正常${NC}"
else
    echo -e "${RED}❌ 数据库连接异常${NC}"
    exit 1
fi

# 检查Redis健康
if curl -f http://localhost:3000/health/redis > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis连接正常${NC}"
else
    echo -e "${YELLOW}⚠️  Redis连接异常（非关键）${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo "================================"
echo ""
echo "📝 服务信息："
echo "   - API地址: http://localhost:3000"
echo "   - 健康检查: http://localhost:3000/health"
echo "   - Swagger文档: http://localhost:3000/api/docs"
echo ""
echo "📋 常用命令："
echo "   - 查看日志: docker-compose logs -f backend"
echo "   - 停止服务: docker-compose stop"
echo "   - 重启服务: docker-compose restart"
echo "   - 查看状态: docker-compose ps"
echo ""
echo "⚠️  生产环境提醒："
echo "   1. 配置Nginx反向代理并启用HTTPS"
echo "   2. 设置防火墙规则"
echo "   3. 配置日志轮转"
echo "   4. 设置数据库定期备份"
echo "   5. 集成监控告警系统"
echo ""
