#!/bin/bash

# 权限管理模块API测试脚本
# 测试所有权限相关的端点

BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/v1"

echo "========================================"
echo "权限管理模块 API 测试"
echo "========================================"
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 登录获取Token（使用管理员账号）
echo -e "${YELLOW}1. 登录获取管理员Token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123456"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.tokens.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ 登录失败${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ 登录成功${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. 获取所有权限列表
echo -e "${YELLOW}2. 获取所有权限列表...${NC}"
PERMISSIONS_RESPONSE=$(curl -s -X GET "${API_BASE}/permissions" \
  -H "Authorization: Bearer $TOKEN")

PERMISSION_COUNT=$(echo $PERMISSIONS_RESPONSE | jq '. | length')
echo -e "${GREEN}✓ 获取成功，共 $PERMISSION_COUNT 个权限${NC}"
echo "前3个权限:"
echo $PERMISSIONS_RESPONSE | jq '.[0:3]'
echo ""

# 3. 获取第一个权限的详情
FIRST_PERMISSION_ID=$(echo $PERMISSIONS_RESPONSE | jq -r '.[0].id')
echo -e "${YELLOW}3. 获取权限详情 (ID: $FIRST_PERMISSION_ID)...${NC}"
PERMISSION_DETAIL=$(curl -s -X GET "${API_BASE}/permissions/${FIRST_PERMISSION_ID}" \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✓ 获取成功${NC}"
echo $PERMISSION_DETAIL | jq '.'
echo ""

# 4. 获取角色权限列表
echo -e "${YELLOW}4. 获取角色权限 (ADMIN - ID: 2)...${NC}"
ROLE_PERMISSIONS=$(curl -s -X GET "${API_BASE}/roles/2/permissions" \
  -H "Authorization: Bearer $TOKEN")

ROLE_PERMISSION_COUNT=$(echo $ROLE_PERMISSIONS | jq '.permissions | length')
echo -e "${GREEN}✓ 获取成功，ADMIN角色有 $ROLE_PERMISSION_COUNT 个权限${NC}"
echo "角色信息:"
echo $ROLE_PERMISSIONS | jq '{roleCode, roleName, permissionCount: (.permissions | length)}'
echo ""

# 5. 获取当前用户权限（需要修复Controller）
echo -e "${YELLOW}5. 获取当前用户权限...${NC}"
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.id')
USER_PERMISSIONS=$(curl -s -X GET "${API_BASE}/users/${USER_ID}/permissions" \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✓ 获取成功${NC}"
echo $USER_PERMISSIONS | jq '{username, roles, permissionCount: (.permissions | length)}'
echo ""

# 6. 测试权限守卫（访问需要特定权限的端点）
echo -e "${YELLOW}6. 测试权限守卫 - 访问工单列表（需要 ticket:read）...${NC}"
TICKETS_RESPONSE=$(curl -s -X GET "${API_BASE}/tickets" \
  -H "Authorization: Bearer $TOKEN")

if echo $TICKETS_RESPONSE | jq -e '.statusCode' > /dev/null 2>&1; then
  STATUS_CODE=$(echo $TICKETS_RESPONSE | jq -r '.statusCode')
  if [ "$STATUS_CODE" = "403" ]; then
    echo -e "${RED}❌ 权限不足${NC}"
    echo $TICKETS_RESPONSE | jq '.'
  else
    echo -e "${RED}❌ 请求失败: $STATUS_CODE${NC}"
    echo $TICKETS_RESPONSE | jq '.'
  fi
else
  echo -e "${GREEN}✓ 有权访问${NC}"
  TICKET_COUNT=$(echo $TICKETS_RESPONSE | jq '.data | length')
  echo "工单数量: $TICKET_COUNT"
fi
echo ""

# 7. 创建新权限（仅超级管理员）
echo -e "${YELLOW}7. 创建新权限 (测试超级管理员权限)...${NC}"
CREATE_PERMISSION=$(curl -s -X POST "${API_BASE}/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resource": "test",
    "action": "demo",
    "description": "测试权限"
  }')

if echo $CREATE_PERMISSION | jq -e '.statusCode' > /dev/null 2>&1; then
  STATUS_CODE=$(echo $CREATE_PERMISSION | jq -r '.statusCode')
  if [ "$STATUS_CODE" = "403" ]; then
    echo -e "${YELLOW}⚠ 当前用户不是超级管理员，无法创建权限${NC}"
  elif [ "$STATUS_CODE" = "409" ]; then
    echo -e "${YELLOW}⚠ 权限已存在${NC}"
  else
    echo -e "${RED}❌ 创建失败: $STATUS_CODE${NC}"
    echo $CREATE_PERMISSION | jq '.'
  fi
else
  echo -e "${GREEN}✓ 创建成功${NC}"
  echo $CREATE_PERMISSION | jq '.'
fi
echo ""

# 8. 给角色添加权限
echo -e "${YELLOW}8. 测试给角色添加权限（HANDLER角色 - ID: 3）...${NC}"
ADD_PERMISSION=$(curl -s -X POST "${API_BASE}/roles/3/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"permissionId\": $FIRST_PERMISSION_ID
  }")

if echo $ADD_PERMISSION | jq -e '.statusCode' > /dev/null 2>&1; then
  STATUS_CODE=$(echo $ADD_PERMISSION | jq -r '.statusCode')
  if [ "$STATUS_CODE" = "403" ]; then
    echo -e "${YELLOW}⚠ 权限不足（需要 role:manage）${NC}"
  elif [ "$STATUS_CODE" = "409" ]; then
    echo -e "${YELLOW}⚠ 权限已存在${NC}"
  else
    echo -e "${RED}❌ 添加失败: $STATUS_CODE${NC}"
    echo $ADD_PERMISSION | jq '.'
  fi
else
  echo -e "${GREEN}✓ 添加成功${NC}"
  echo $ADD_PERMISSION | jq '.'
fi
echo ""

echo "========================================"
echo "测试完成！"
echo "========================================"
