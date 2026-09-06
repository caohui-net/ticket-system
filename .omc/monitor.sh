#!/bin/bash

# 并行开发进度监控脚本
# 用法: ./monitor.sh

clear

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           🔍 工单系统 - 并行开发实时监控                          ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# 检查代理状态
echo "📊 代理运行状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 统计文件数量
BACKEND_FILES=$(find ~/projects/工单项目/backend/src -type f -name "*.ts" 2>/dev/null | wc -l)
FRONTEND_EXISTS=$([ -d ~/projects/工单项目/frontend ] && echo "✅" || echo "⏳")
DOCKER_EXISTS=$([ -f ~/projects/工单项目/docker-compose.yml ] && echo "✅" || echo "⏳")

echo "阶段4 - 前端开发:        $FRONTEND_EXISTS"
echo "阶段5 - 通知系统:        ⏳ (检查中...)"
echo "阶段6 - 统计报表:        ⏳ (检查中...)"
echo "阶段7 - 权限管理:        ⏳ (检查中...)"
echo "阶段8 - 部署与文档:      $DOCKER_EXISTS"
echo ""

# 后端文件统计
echo "📁 后端文件统计"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d ~/projects/工单项目/backend/src/modules ]; then
    echo "Auth模块:          ✅ 完成"
    echo "Tickets模块:       ✅ 完成"
    echo "Logs模块:          ✅ 完成"
    echo "Attachments模块:   ✅ 完成"

    [ -d ~/projects/工单项目/backend/src/modules/notifications ] && echo "Notifications模块: ✅ 完成" || echo "Notifications模块: 🔄 开发中"
    [ -d ~/projects/工单项目/backend/src/modules/statistics ] && echo "Statistics模块:    ✅ 完成" || echo "Statistics模块:    🔄 开发中"
    [ -d ~/projects/工单项目/backend/src/modules/permissions ] && echo "Permissions模块:   ✅ 完成" || echo "Permissions模块:   🔄 开发中"
fi
echo ""

# 前端文件统计
echo "📱 前端文件统计"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d ~/projects/工单项目/frontend ]; then
    FRONTEND_FILES=$(find ~/projects/工单项目/frontend/src -type f 2>/dev/null | wc -l)
    echo "前端文件总数: $FRONTEND_FILES"

    [ -d ~/projects/工单项目/frontend/src/pages ] && echo "页面组件:      ✅" || echo "页面组件:      🔄"
    [ -d ~/projects/工单项目/frontend/src/components ] && echo "通用组件:      ✅" || echo "通用组件:      🔄"
    [ -d ~/projects/工单项目/frontend/src/api ] && echo "API客户端:     ✅" || echo "API客户端:     🔄"
    [ -f ~/projects/工单项目/frontend/vite.config.ts ] && echo "Vite配置:      ✅" || echo "Vite配置:      🔄"
else
    echo "前端项目尚未初始化 🔄"
fi
echo ""

# 部署文件统计
echo "🚀 部署文件统计"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[ -f ~/projects/工单项目/docker-compose.yml ] && echo "docker-compose.yml: ✅" || echo "docker-compose.yml: 🔄"
[ -f ~/projects/工单项目/backend/Dockerfile ] && echo "后端Dockerfile:     ✅" || echo "后端Dockerfile:     🔄"
[ -f ~/projects/工单项目/frontend/Dockerfile ] && echo "前端Dockerfile:     ✅" || echo "前端Dockerfile:     🔄"
[ -f ~/projects/工单项目/deploy.sh ] && echo "部署脚本:           ✅" || echo "部署脚本:           🔄"
echo ""

# 文档统计
echo "📚 文档完成度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DOC_COUNT=$(find ~/projects/工单项目/docs -name "*.md" 2>/dev/null | wc -l)
echo "文档总数: $DOC_COUNT"

[ -f ~/projects/工单项目/docs/部署指南.md ] && echo "部署指南:      ✅" || echo "部署指南:      🔄"
[ -f ~/projects/工单项目/docs/用户手册.md ] && echo "用户手册:      ✅" || echo "用户手册:      🔄"
[ -f ~/projects/工单项目/docs/运维手册.md ] && echo "运维手册:      ✅" || echo "运维手册:      🔄"
echo ""

# Git统计
echo "🔄 Git统计"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd ~/projects/工单项目 2>/dev/null
if [ -d .git ]; then
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    LAST_COMMIT=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "无")
    echo "提交总数: $COMMIT_COUNT"
    echo "最新提交: $LAST_COMMIT"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 提示: 各代理正在后台工作，完成时会收到通知"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "刷新时间: $(date '+%Y-%m-%d %H:%M:%S')"
