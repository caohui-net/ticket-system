#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "用户认证模块 - API测试脚本"
echo "=================================="
echo ""

# 检查服务是否运行
echo -e "${YELLOW}检查服务状态...${NC}"
if ! curl -s http://localhost:3000/api/v1/auth/login > /dev/null 2>&1; then
    echo -e "${RED}✗ 服务未运行，请先启动: cd backend && npm run start:dev${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 服务正在运行${NC}"
echo ""

# 测试1: 用户注册
echo -e "${YELLOW}测试1: 用户注册${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_api",
    "password": "Password123!",
    "realName": "API测试用户",
    "email": "testapi@example.com",
    "phone": "13900139000",
    "department": "测试部"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "username"; then
    echo -e "${GREEN}✓ 注册成功${NC}"
    echo "响应: $REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
else
    echo -e "${RED}✗ 注册失败${NC}"
    echo "响应: $REGISTER_RESPONSE"
fi
echo ""

# 测试2: 使用种子数据用户登录
echo -e "${YELLOW}测试2: 用户登录 (zhangsan)${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "password": "Password123!"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ 登录成功${NC}"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken')
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.refreshToken')
    echo "用户信息: $(echo "$LOGIN_RESPONSE" | jq '.user')"
    echo "访问令牌前20字符: ${ACCESS_TOKEN:0:20}..."
else
    echo -e "${RED}✗ 登录失败${NC}"
    echo "响应: $LOGIN_RESPONSE"
    exit 1
fi
echo ""

# 测试3: 获取当前用户信息
echo -e "${YELLOW}测试3: 获取当前用户信息${NC}"
ME_RESPONSE=$(curl -s -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$ME_RESPONSE" | grep -q "username"; then
    echo -e "${GREEN}✓ 获取用户信息成功${NC}"
    echo "用户信息: $ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"
else
    echo -e "${RED}✗ 获取用户信息失败${NC}"
    echo "响应: $ME_RESPONSE"
fi
echo ""

# 测试4: 刷新Token
echo -e "${YELLOW}测试4: 刷新访问令牌${NC}"
sleep 2  # 等待2秒确保token可以被刷新
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

if echo "$REFRESH_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ Token刷新成功${NC}"
    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.accessToken')
    echo "新访问令牌前20字符: ${NEW_ACCESS_TOKEN:0:20}..."
else
    echo -e "${RED}✗ Token刷新失败${NC}"
    echo "响应: $REFRESH_RESPONSE"
fi
echo ""

# 测试5: 登出
echo -e "${YELLOW}测试5: 用户登出${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$LOGOUT_RESPONSE" | grep -q "登出成功"; then
    echo -e "${GREEN}✓ 登出成功${NC}"
    echo "响应: $LOGOUT_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGOUT_RESPONSE"
else
    echo -e "${RED}✗ 登出失败${NC}"
    echo "响应: $LOGOUT_RESPONSE"
fi
echo ""

# 测试6: 错误场景 - 密码错误
echo -e "${YELLOW}测试6: 错误场景 - 密码错误${NC}"
ERROR_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "password": "WrongPassword!"
  }')

if echo "$ERROR_RESPONSE" | grep -q "401"; then
    echo -e "${GREEN}✓ 正确返回401错误${NC}"
else
    echo -e "${YELLOW}⚠ 响应: $ERROR_RESPONSE${NC}"
fi
echo ""

# 测试7: 错误场景 - 无Token访问受保护路由
echo -e "${YELLOW}测试7: 错误场景 - 无Token访问受保护路由${NC}"
UNAUTH_RESPONSE=$(curl -s -X GET http://localhost:3000/api/v1/auth/me)

if echo "$UNAUTH_RESPONSE" | grep -q "Unauthorized"; then
    echo -e "${GREEN}✓ 正确返回Unauthorized错误${NC}"
else
    echo -e "${YELLOW}⚠ 响应: $UNAUTH_RESPONSE${NC}"
fi
echo ""

echo "=================================="
echo -e "${GREEN}API测试完成！${NC}"
echo "=================================="
echo ""
echo "可以访问Swagger文档查看完整API: http://localhost:3000/api/docs"
