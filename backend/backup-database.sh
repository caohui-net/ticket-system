#!/bin/bash

# 数据库备份脚本
# 用于定期备份PostgreSQL数据库

set -e

# 配置
BACKUP_DIR="/home/caohui/projects/工单项目/backend/backups"
DB_CONTAINER="ticket-system-db"
DB_USER="${DB_USER:-ticketuser}"
DB_NAME="${DB_NAME:-ticket_system}"
RETENTION_DAYS=7

# 日期格式
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DB_NAME}_${DATE}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================"
echo "🗄️  数据库备份脚本"
echo "================================"
echo ""

# 创建备份目录
if [ ! -d "$BACKUP_DIR" ]; then
    echo "📁 创建备份目录: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# 检查Docker容器是否运行
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo -e "${RED}❌ 数据库容器未运行: $DB_CONTAINER${NC}"
    exit 1
fi

echo "🚀 开始备份..."
echo "   数据库: $DB_NAME"
echo "   备份文件: $BACKUP_FILE"
echo ""

# 执行备份
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_PATH"; then
    # 压缩备份文件
    echo "📦 压缩备份文件..."
    gzip "$BACKUP_PATH"
    BACKUP_PATH="${BACKUP_PATH}.gz"

    # 获取文件大小
    SIZE=$(du -h "$BACKUP_PATH" | cut -f1)

    echo -e "${GREEN}✅ 备份成功${NC}"
    echo "   文件: $BACKUP_PATH"
    echo "   大小: $SIZE"
else
    echo -e "${RED}❌ 备份失败${NC}"
    exit 1
fi

echo ""
echo "🧹 清理旧备份（保留 ${RETENTION_DAYS} 天）..."

# 删除旧备份
find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# 统计备份文件数量
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" | wc -l)
echo "   当前备份文件数量: $BACKUP_COUNT"

echo ""
echo "================================"
echo -e "${GREEN}✅ 备份完成！${NC}"
echo "================================"

# 列出最近的5个备份
echo ""
echo "📋 最近的备份文件:"
ls -lht "$BACKUP_DIR"/backup_${DB_NAME}_*.sql.gz 2>/dev/null | head -5 || echo "   无备份文件"

# 可选：发送通知（需要配置邮件或其他通知方式）
# 如果备份失败，可以在这里发送告警
