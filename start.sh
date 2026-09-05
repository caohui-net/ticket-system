#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}  工单管理系统 - 快速启动脚本${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker未运行，请先启动Docker${NC}"
    exit 1
fi

# 启动数据库服务
echo -e "${YELLOW}📦 1/4 启动数据库服务...${NC}"
docker-compose up -d postgres redis

# 等待数据库就绪
echo -e "${YELLOW}⏳ 等待数据库启动...${NC}"
sleep 5

# 检查后端依赖
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}📦 2/4 安装后端依赖...${NC}"
    cd backend && npm install && cd ..
else
    echo -e "${GREEN}✅ 2/4 后端依赖已存在${NC}"
fi

# 初始化数据库
echo -e "${YELLOW}🔧 3/4 初始化数据库...${NC}"
cd backend
if [ ! -d "node_modules/.prisma" ]; then
    npm run prisma:generate
fi
npm run prisma:migrate
cd ..

# 检查前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 4/4 安装前端依赖...${NC}"
    cd frontend && npm install && cd ..
else
    echo -e "${GREEN}✅ 4/4 前端依赖已存在${NC}"
fi

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}✅ 环境准备完成！${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${YELLOW}接下来请在两个终端中分别运行:${NC}"
echo ""
echo -e "  ${GREEN}终端1 (后端):${NC}"
echo -e "    cd backend && npm run start:dev"
echo ""
echo -e "  ${GREEN}终端2 (前端):${NC}"
echo -e "    cd frontend && npm run dev"
echo ""
echo -e "${YELLOW}访问地址:${NC}"
echo -e "  前端: ${GREEN}http://localhost:5173${NC}"
echo -e "  后端: ${GREEN}http://localhost:3000/api${NC}"
echo -e "  文档: ${GREEN}http://localhost:3000/api/docs${NC}"
echo ""
