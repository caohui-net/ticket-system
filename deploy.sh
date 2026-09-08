#!/bin/bash

# ==========================================
# 学校工单管理系统 - 生产环境部署脚本
# ==========================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示标题
echo "========================================"
echo "   学校工单管理系统 - 生产环境部署"
echo "========================================"
echo ""

# 1. 检查依赖
log_info "检查依赖工具..."

if ! command -v docker &> /dev/null; then
    log_error "Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

log_success "依赖工具检查完成"

# 2. 检查环境变量文件
log_info "检查环境变量配置..."

if [ ! -f ".env.production" ]; then
    log_warning ".env.production 不存在，从示例文件创建"
    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env.production
        log_warning "请编辑 .env.production 文件，配置生产环境变量"
        log_warning "特别注意修改以下配置："
        log_warning "  - DB_PASSWORD (数据库密码)"
        log_warning "  - REDIS_PASSWORD (Redis密码)"
        log_warning "  - JWT_SECRET (JWT密钥)"
        log_warning "  - JWT_REFRESH_SECRET (刷新令牌密钥)"
        echo ""
        read -p "是否已完成配置？(y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "请完成配置后再运行部署脚本"
            exit 1
        fi
    else
        log_error ".env.production.example 不存在"
        exit 1
    fi
fi

# 加载环境变量
export $(cat .env.production | grep -v '^#' | xargs)

log_success "环境变量检查完成"

# 3. 备份数据库（如果已有数据）
log_info "检查是否需要备份数据库..."

if docker ps -a | grep -q ticket-postgres-prod; then
    log_warning "发现已存在的数据库容器"
    read -p "是否备份数据库？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        BACKUP_DIR="./database/backups"
        mkdir -p $BACKUP_DIR
        BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

        log_info "备份数据库到 $BACKUP_FILE ..."
        docker exec ticket-postgres-prod pg_dump -U ${DB_USER:-ticketing} ${DB_NAME:-ticketing} > $BACKUP_FILE

        if [ -f "$BACKUP_FILE" ]; then
            log_success "数据库备份完成: $BACKUP_FILE"
        else
            log_error "数据库备份失败"
            exit 1
        fi
    fi
fi

# 4. 停止旧容器
log_info "停止旧容器..."
docker-compose -f docker-compose.prod.yml down
log_success "旧容器已停止"

# 5. 拉取最新代码（如果使用Git）
if [ -d ".git" ]; then
    log_info "拉取最新代码..."
    git pull origin main || log_warning "代码拉取失败或不在Git仓库中"
fi

# 6. 构建镜像
log_info "构建Docker镜像..."
docker-compose -f docker-compose.prod.yml build --no-cache

if [ $? -eq 0 ]; then
    log_success "镜像构建完成"
else
    log_error "镜像构建失败"
    exit 1
fi

# 7. 启动服务
log_info "启动服务..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -eq 0 ]; then
    log_success "服务启动成功"
else
    log_error "服务启动失败"
    exit 1
fi

# 8. 等待服务就绪
log_info "等待服务启动..."
sleep 15

# 9. 检查数据库连接
log_info "检查数据库连接..."
for i in {1..10}; do
    if docker exec ticket-postgres-prod pg_isready -U ${DB_USER:-ticketing} -d ${DB_NAME:-ticketing} &> /dev/null; then
        log_success "数据库已就绪"
        break
    fi
    if [ $i -eq 10 ]; then
        log_error "数据库启动超时"
        docker-compose -f docker-compose.prod.yml logs postgres
        exit 1
    fi
    log_info "等待数据库启动... ($i/10)"
    sleep 3
done

# 10. 运行数据库迁移
log_info "运行数据库迁移..."
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

if [ $? -eq 0 ]; then
    log_success "数据库迁移完成"
else
    log_error "数据库迁移失败"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# 11. 健康检查
log_info "执行健康检查..."
sleep 10

# 检查后端健康
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${BACKEND_PORT:-3000}/api/health || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
    log_success "后端服务健康 (HTTP 200)"
else
    log_error "后端服务异常 (HTTP $BACKEND_HEALTH)"
    docker-compose -f docker-compose.prod.yml logs backend
fi

# 检查前端健康
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${FRONTEND_PORT:-80}/ || echo "000")
if [ "$FRONTEND_HEALTH" = "200" ]; then
    log_success "前端服务健康 (HTTP 200)"
else
    log_error "前端服务异常 (HTTP $FRONTEND_HEALTH)"
    docker-compose -f docker-compose.prod.yml logs frontend
fi

# 12. 显示服务状态
log_info "服务状态："
docker-compose -f docker-compose.prod.yml ps

# 13. 显示访问信息
echo ""
echo "========================================"
echo "          部署完成！"
echo "========================================"
echo ""
log_success "前端访问地址: http://localhost:${FRONTEND_PORT:-80}"
log_success "后端访问地址: http://localhost:${BACKEND_PORT:-3000}"
log_success "API文档地址: http://localhost:${BACKEND_PORT:-3000}/api/docs"
echo ""
log_info "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
log_info "停止服务: docker-compose -f docker-compose.prod.yml down"
log_info "重启服务: docker-compose -f docker-compose.prod.yml restart"
echo ""

# 14. 提示安全建议
log_warning "生产环境安全建议："
log_warning "  1. 修改所有默认密码和密钥"
log_warning "  2. 配置HTTPS证书"
log_warning "  3. 配置防火墙规则"
log_warning "  4. 定期备份数据库"
log_warning "  5. 启用系统监控"
log_warning "  6. 查看并遵守 docs/运维手册.md"
echo ""
