.PHONY: help install db-up db-down db-init dev stop clean backend-dev frontend-dev

# 默认目标
help:
	@echo "工单管理系统 - 可用命令:"
	@echo ""
	@echo "  make install      - 安装所有依赖"
	@echo "  make db-up        - 启动数据库服务(PostgreSQL + Redis)"
	@echo "  make db-down      - 停止数据库服务"
	@echo "  make db-init      - 初始化数据库(生成Prisma客户端并执行迁移)"
	@echo "  make dev          - 启动开发环境(需要分别运行backend-dev和frontend-dev)"
	@echo "  make backend-dev  - 启动后端开发服务器"
	@echo "  make frontend-dev - 启动前端开发服务器"
	@echo "  make stop         - 停止所有服务"
	@echo "  make clean        - 清理所有数据(包括数据库数据)"
	@echo ""

# 安装依赖
install:
	@echo "📦 安装后端依赖..."
	cd backend && npm install
	@echo "📦 安装前端依赖..."
	cd frontend && npm install
	@echo "✅ 依赖安装完成"

# 启动数据库服务
db-up:
	@echo "🚀 启动数据库服务..."
	docker-compose up -d postgres redis
	@echo "⏳ 等待数据库启动..."
	@sleep 5
	@echo "✅ 数据库服务已启动"

# 停止数据库服务
db-down:
	@echo "🛑 停止数据库服务..."
	docker-compose down
	@echo "✅ 数据库服务已停止"

# 初始化数据库
db-init:
	@echo "🔧 初始化数据库..."
	cd backend && npm run prisma:generate
	cd backend && npm run prisma:migrate
	@echo "✅ 数据库初始化完成"

# 启动后端开发服务器
backend-dev:
	@echo "🚀 启动后端开发服务器..."
	cd backend && npm run start:dev

# 启动前端开发服务器
frontend-dev:
	@echo "🚀 启动前端开发服务器..."
	cd frontend && npm run dev

# 启动开发环境提示
dev:
	@echo "📝 开发环境启动步骤:"
	@echo ""
	@echo "1. 确保数据库已启动: make db-up"
	@echo "2. 初始化数据库(首次): make db-init"
	@echo "3. 终端1: make backend-dev"
	@echo "4. 终端2: make frontend-dev"
	@echo ""
	@echo "或者分别在两个终端中运行:"
	@echo "  终端1: cd backend && npm run start:dev"
	@echo "  终端2: cd frontend && npm run dev"

# 停止所有服务
stop:
	@echo "🛑 停止所有服务..."
	docker-compose down
	@echo "✅ 所有服务已停止"

# 清理所有数据
clean:
	@echo "🧹 清理所有数据..."
	docker-compose down -v
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf backend/dist
	rm -rf frontend/dist
	@echo "✅ 清理完成"
