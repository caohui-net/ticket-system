# 工单管理系统 - 验证指南

**日期**: 2026-09-06  
**状态**: 等待用户验证

---

## 📋 当前状态

### ✅ 已完成
- 所有设计文档（17个文档）
- 项目脚手架（前端 + 后端）
- 后端认证模块代码（100%完成）
- 前端认证界面（100%完成）
- 单元测试（13/13通过）
- E2E测试（已编写）

### ⏳ 等待验证
- 数据库初始化
- 后端服务启动
- 前后端联调测试

---

## 🚀 快速验证步骤

### 方式1: 一键启动（推荐）⭐

```bash
cd ~/projects/工单项目/backend
./quick-start.sh
```

这个脚本会自动完成：
1. 检查PostgreSQL连接
2. 同步数据库Schema
3. 初始化种子数据
4. 启动开发服务器

### 方式2: 手动步骤

```bash
# 1. 进入后端目录
cd ~/projects/工单项目/backend

# 2. 确认依赖已安装
npm install

# 3. 同步数据库Schema
npx prisma db push

# 4. 初始化种子数据
npm run prisma:seed

# 5. 启动开发服务器
npm run start:dev
```

---

## ✅ 验证检查清单

### 1️⃣ 后端服务验证

**检查服务是否启动**:
```bash
# 服务应该在 http://localhost:3000 运行
curl http://localhost:3000/api/v1/auth/login
```

**预期结果**: 返回400错误（因为没有提供登录凭证），这说明服务正常运行。

### 2️⃣ Swagger API文档验证

打开浏览器访问：
```
http://localhost:3000/api/docs
```

**应该看到**:
- 完整的API文档界面
- 5个认证相关的API端点
- 可以直接在页面测试API

### 3️⃣ 登录功能验证

**测试登录**:
```bash
cd ~/projects/工单项目/backend
./test-api.sh
```

或手动测试：
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "password": "Password123!"
  }'
```

**预期结果**: 返回包含 `accessToken` 和 `refreshToken` 的JSON。

### 4️⃣ 注册功能验证

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test@123456",
    "email": "test@example.com",
    "realName": "测试用户",
    "department": "测试部"
  }'
```

**预期结果**: 返回新创建的用户信息。

### 5️⃣ 获取用户信息验证

```bash
# 先登录获取token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"zhangsan","password":"Password123!"}' | \
  grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 使用token获取用户信息
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**预期结果**: 返回当前登录用户的详细信息。

---

## 🧪 测试账号

种子数据已创建以下测试账号（密码均为: `Password123!`）:

| 用户名 | 密码 | 角色 | 部门 |
|--------|------|------|------|
| admin | Password123! | 系统管理员 | IT部 |
| zhangsan | Password123! | 工单创建者 | 技术部 |
| lisi | Password123! | 处理人员 | 技术部 |
| wangwu | Password123! | 部门主管 | 市场部 |
| zhaoliu | Password123! | 分管领导 | 人事部 |

---

## 🌐 前端验证

### 启动前端服务

```bash
# 新开一个终端
cd ~/projects/工单项目/frontend
npm install
npm run dev
```

### 访问前端

打开浏览器访问：
```
http://localhost:5173
```

### 测试登录流程

1. 应该自动跳转到登录页面
2. 使用测试账号登录（如 `zhangsan` / `Password123!`）
3. 登录成功后应该跳转到主页面
4. 检查Token是否正确保存（浏览器开发者工具 -> Application -> Local Storage）

---

## 🔍 故障排查

### 问题1: PostgreSQL连接失败

**症状**: `prisma db push` 报错连接数据库

**解决**:
```bash
# 检查PostgreSQL是否运行
sudo systemctl status postgresql

# 或使用Docker启动
docker-compose up -d postgres
```

### 问题2: 端口占用

**症状**: `Address already in use` 错误

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

### 问题3: Prisma Client未生成

**症状**: `Cannot find module '@prisma/client'`

**解决**:
```bash
cd ~/projects/工单项目/backend
npx prisma generate
```

### 问题4: 种子数据初始化失败

**症状**: `prisma:seed` 报错

**解决**:
```bash
# 重置数据库
npx prisma migrate reset

# 重新初始化
npx prisma db push
npm run prisma:seed
```

---

## 📊 预期输出示例

### 成功的登录响应

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "realName": "张三",
    "department": "技术部",
    "roles": ["CREATOR"]
  }
}
```

### 成功的用户信息响应

```json
{
  "id": 2,
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "realName": "张三",
  "department": "技术部",
  "phone": null,
  "avatar": null,
  "status": "active",
  "roles": [
    {
      "id": 1,
      "code": "CREATOR",
      "name": "工单创建者"
    }
  ]
}
```

---

## 🎯 验证完成标准

确认以下所有项都通过：

- [ ] 后端服务成功启动（http://localhost:3000）
- [ ] Swagger文档可访问（http://localhost:3000/api/docs）
- [ ] 登录API正常工作
- [ ] 注册API正常工作
- [ ] Token验证正常工作
- [ ] 获取用户信息正常工作
- [ ] 前端服务成功启动（http://localhost:5173）
- [ ] 前端登录界面正常显示
- [ ] 前后端联调成功（可以完整登录）
- [ ] Token自动刷新机制工作
- [ ] 登出功能正常

---

## 📝 验证后下一步

验证通过后，可以：

1. **提交代码**: 
   ```bash
   cd ~/projects/工单项目
   git add .
   git commit -m "feat: 完成用户认证模块（后端+前端）"
   ```

2. **开始阶段3**: 实现工单管理核心功能
   - 参考：`docs/阶段3工作计划.md`

3. **部署测试环境**: 使用Docker Compose部署完整环境

---

## 📞 需要帮助？

如果遇到任何问题：

1. 查看日志：`npm run start:dev` 的输出
2. 检查数据库：`npx prisma studio`
3. 查看详细文档：`backend-README.md`
4. 运行测试：`npm run test`

---

**验证预计时间**: 5-10分钟  
**状态**: ⏳ 等待用户执行验证步骤
