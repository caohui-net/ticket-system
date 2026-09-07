#!/bin/bash

# 数据库恢复脚本
# 用于从备份恢复PostgreSQL数据库

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置
BACKUP_DIR="/home/caohui/projects/工单项目/backend/backups"
DB_CONTAINER="ticket-system-db"
DB_USER="${DB_USER:-ticketuser}"
DB_NAME="${DB_NAME:-ticket_system}"

echo "================================"
echo "🔄 数据库恢复脚本"
echo "================================"
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo "用法: $0 <备份文件>"
    echo ""
    echo "示例:"
    echo "  $0 backup_ticket_system_20240101_120000.sql.gz"
    echo "  $0 backups/backup_ticket_system_20240101_120000.sql.gz"
    echo ""
    echo "可用的备份文件:"
    ls -lht "$BACKUP_DIR"/backup_${DB_NAME}_*.sql.gz 2>/dev/null | head -10 || echo "  无备份文件"
    exit 1
fi

BACKUP_FILE="$1"

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    # 尝试在备份目录中查找
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        echo -e "${RED}❌ 备份文件不存在: $BACKUP_FILE${NC}"
        exit 1
    fi
fi

echo "📋 恢复信息:"
echo "   备份文件: $BACKUP_FILE"
echo "   数据库容器: $DB_CONTAINER"
echo "   数据库名: $DB_NAME"
echo ""

# 确认操作
echo -e "${YELLOW}⚠️  警告: 此操作将覆盖当前数据库！${NC}"
read -p "确认恢复？(yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "操作已取消"
    exit 0
fi

# 检查Docker容器是否运行
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo -e "${RED}❌ 数据库容器未运行: $DB_CONTAINER${NC}"
    exit 1
fi

# 创建当前数据库的备份（安全措施）
echo "🛡️  创建当前数据库备份（安全措施）..."
SAFETY_BACKUP="$BACKUP_DIR/before_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$SAFETY_BACKUP"; then
    echo -e "${GREEN}✅ 安全备份创建成功: $SAFETY_BACKUP${NC}"
else
    echo -e "${RED}❌ 安全备份失败，恢复操作终止${NC}"
    exit 1
fi
echo ""

# 解压备份文件（如果是压缩的）
TEMP_SQL="/tmp/restore_$(date +%s).sql"
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "📦 解压备份文件..."
    gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"
else
    cp "$BACKUP_FILE" "$TEMP_SQL"
fi

# 停止应用容器（避免数据冲突）
echo "🛑 停止应用服务..."
docker-compose stop backend 2>/dev/null || true

echo ""
echo "🚀 开始恢复数据库..."

# 删除现有连接
echo "   断开现有数据库连接..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true

# 删除并重建数据库
echo "   重建数据库..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" >/dev/null
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" >/dev/null

# 恢复数据
echo "   导入数据..."
if cat "$TEMP_SQL" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 数据恢复成功${NC}"
else
    echo -e "${RED}❌ 数据恢复失败${NC}"
    echo ""
    echo "尝试从安全备份恢复..."
    gunzip -c "$SAFETY_BACKUP" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1
    rm -f "$TEMP_SQL"
    exit 1
fi

# 清理临时文件
rm -f "$TEMP_SQL"

# 重启应用容器
echo ""
echo "🚀 启动应用服务..."
docker-compose start backend

# 等待应用启动
echo "⏳ 等待应用启动..."
sleep 10

# 健康检查
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 应用启动成功${NC}"
else
    echo -e "${YELLOW}⚠️  应用可能未完全启动，请手动检查${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}✅ 恢复完成！${NC}"
echo "================================"
echo ""
echo "📝 注意事项:"
echo "   1. 请验证数据完整性"
echo "   2. 检查应用功能是否正常"
echo "   3. 安全备份保存在: $SAFETY_BACKUP"
echo ""
