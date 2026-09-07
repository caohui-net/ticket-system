#!/bin/bash

# 环境检查脚本
# 检查生产环境部署前的所有必需条件

set -e

echo "================================"
echo "🔍 生产环境检查"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# 函数：检查命令是否存在
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $2: $(command -v $1)${NC}"
        if [ ! -z "$3" ]; then
            echo -e "   版本: $($1 $3 2>&1 | head -1)"
        fi
        return 0
    else
        echo -e "${RED}❌ $2 未安装${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# 函数：检查端口是否被占用
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  端口 $1 已被占用${NC}"
        lsof -Pi :$1 -sTCP:LISTEN
        WARNINGS=$((WARNINGS + 1))
        return 1
    else
        echo -e "${GREEN}✅ 端口 $1 可用${NC}"
        return 0
    fi
}

echo "📦 检查系统工具"
echo "--------------------------------"
check_command docker "Docker" "--version"
check_command docker-compose "Docker Compose" "--version"
check_command curl "curl" "--version"
check_command git "Git" "--version"
echo ""

echo "🔌 检查端口占用"
echo "--------------------------------"
check_port 3000
check_port 5432
check_port 6379
echo ""

echo "💾 检查磁盘空间"
echo "--------------------------------"
available_space=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$available_space" -lt 10 ]; then
    echo -e "${RED}❌ 磁盘空间不足: ${available_space}GB（需要至少10GB）${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ 磁盘空间充足: ${available_space}GB${NC}"
fi
echo ""

echo "🧠 检查内存"
echo "--------------------------------"
if command -v free &> /dev/null; then
    available_mem=$(free -g | awk '/^Mem:/{print $7}')
    total_mem=$(free -g | awk '/^Mem:/{print $2}')
    echo "   总内存: ${total_mem}GB"
    echo "   可用内存: ${available_mem}GB"
    if [ "$available_mem" -lt 2 ]; then
        echo -e "${YELLOW}⚠️  可用内存较低: ${available_mem}GB（建议至少2GB）${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ 内存充足${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  无法检查内存（free命令不可用）${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo "📄 检查配置文件"
echo "--------------------------------"
if [ -f .env ]; then
    echo -e "${GREEN}✅ .env 文件存在${NC}"

    # 检查关键配置
    source .env

    # JWT_SECRET
    if [ "$JWT_SECRET" = "your_super_secret_jwt_key_change_this_in_production_min_32_chars" ]; then
        echo -e "${RED}❌ JWT_SECRET 未修改${NC}"
        ERRORS=$((ERRORS + 1))
    else
        if [ ${#JWT_SECRET} -lt 32 ]; then
            echo -e "${YELLOW}⚠️  JWT_SECRET 长度不足32字符${NC}"
            WARNINGS=$((WARNINGS + 1))
        else
            echo -e "${GREEN}✅ JWT_SECRET 已配置${NC}"
        fi
    fi

    # DB_PASSWORD
    if [ "$DB_PASSWORD" = "your_secure_password_change_this" ]; then
        echo -e "${RED}❌ DB_PASSWORD 未修改${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ DB_PASSWORD 已配置${NC}"
    fi

    # NODE_ENV
    if [ "$NODE_ENV" != "production" ]; then
        echo -e "${YELLOW}⚠️  NODE_ENV 不是 'production': $NODE_ENV${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ NODE_ENV 设置为 production${NC}"
    fi

    # CORS_ORIGIN
    if [ "$CORS_ORIGIN" = "*" ]; then
        echo -e "${YELLOW}⚠️  CORS_ORIGIN 设置为 '*'（允许所有来源）${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ CORS_ORIGIN 已限制${NC}"
    fi

else
    echo -e "${RED}❌ .env 文件不存在${NC}"
    ERRORS=$((ERRORS + 1))

    if [ -f .env.production ]; then
        echo -e "${YELLOW}   提示: 可以从 .env.production 复制${NC}"
    fi
fi
echo ""

echo "🐳 检查Docker服务"
echo "--------------------------------"
if systemctl is-active --quiet docker 2>/dev/null; then
    echo -e "${GREEN}✅ Docker 服务运行中${NC}"
elif docker info >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker 可访问${NC}"
else
    echo -e "${RED}❌ Docker 服务未运行${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

echo "📁 检查项目文件"
echo "--------------------------------"
required_files=(
    "package.json"
    "Dockerfile"
    "docker-compose.yml"
    "prisma/schema.prisma"
    "src/main.ts"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file 不存在${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

echo "🔐 安全检查"
echo "--------------------------------"

# 检查.dockerignore
if [ -f .dockerignore ]; then
    echo -e "${GREEN}✅ .dockerignore 存在${NC}"
else
    echo -e "${YELLOW}⚠️  .dockerignore 不存在${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 检查.gitignore
if [ -f .gitignore ]; then
    if grep -q ".env" .gitignore; then
        echo -e "${GREEN}✅ .env 在 .gitignore 中${NC}"
    else
        echo -e "${RED}❌ .env 不在 .gitignore 中${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  .gitignore 不存在${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "================================"
echo "📊 检查摘要"
echo "================================"
echo -e "错误: ${RED}${ERRORS}${NC}"
echo -e "警告: ${YELLOW}${WARNINGS}${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ 环境检查失败，请修复错误后再部署${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  环境检查通过，但存在警告${NC}"
    echo -e "${YELLOW}建议修复警告后再进行生产部署${NC}"
    exit 0
else
    echo -e "${GREEN}✅ 环境检查通过，可以开始部署${NC}"
    echo ""
    echo "运行以下命令开始部署："
    echo "  ./deploy-production.sh"
    exit 0
fi
