#!/bin/bash

# 统计报表模块API测试脚本

BASE_URL="http://localhost:3000/api/v1"

echo "=== 统计报表模块 API 测试 ==="
echo ""

# 检查服务是否运行
echo "1. 检查健康状态..."
curl -s "$BASE_URL/health" | head -5
echo -e "\n"

# 注意：以下API需要JWT Token，实际使用时需要先登录获取token
# TOKEN="your_jwt_token_here"

echo "2. API端点列表："
echo "   GET /api/v1/statistics/overview - 概览统计"
echo "   GET /api/v1/statistics/tickets/by-status - 按状态统计"
echo "   GET /api/v1/statistics/tickets/by-priority - 按优先级统计"
echo "   GET /api/v1/statistics/tickets/trend?days=7 - 工单趋势"
echo "   GET /api/v1/statistics/response-time - 响应时间统计"
echo "   GET /api/v1/statistics/users/workload - 用户工作量"
echo "   GET /api/v1/statistics/users/active - 活跃用户"
echo ""

echo "3. 使用示例（需要JWT Token）："
echo "   curl -H 'Authorization: Bearer \$TOKEN' $BASE_URL/statistics/overview"
echo ""

echo "=== 测试完成 ==="
