# Frontend - React工单管理系统

## 技术栈

- **框架**: React 18
- **语言**: TypeScript 5.x
- **构建工具**: Vite 5.x
- **路由**: React Router 6.x
- **状态管理**: Zustand 4.x
- **UI组件库**: Ant Design 5.x
- **HTTP客户端**: Axios 1.x
- **表单管理**: React Hook Form 7.x
- **数据校验**: Zod 3.x

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 配置环境变量

`.env.development` 已包含默认配置,如需修改请根据实际情况调整。

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

## 可用命令

```bash
# 开发
npm run dev              # 启动开发服务器(热重载)

# 构建
npm run build            # 构建生产版本
npm run preview          # 预览生产构建

# 代码质量
npm run lint             # 代码检查
npm run format           # 代码格式化
```

## 项目结构

```
src/
├── api/                # API接口
│   ├── index.ts       # API统一导出
│   ├── request.ts     # Axios封装
│   ├── auth.ts        # 认证接口
│   ├── ticket.ts      # 工单接口
│   └── user.ts        # 用户接口
├── assets/            # 静态资源
│   ├── images/
│   ├── icons/
│   └── styles/
│       └── global.css
├── components/        # 通用组件
│   ├── Layout/       # 布局组件
│   ├── TicketCard/   # 工单卡片
│   ├── StatusBadge/  # 状态徽章
│   └── ...
├── pages/            # 页面组件
│   ├── Auth/        # 认证页面
│   ├── Ticket/      # 工单页面
│   ├── Dashboard/   # 统计看板
│   └── ...
├── hooks/            # 自定义Hooks
├── store/            # 状态管理
├── types/            # TypeScript类型
├── utils/            # 工具函数
├── router/           # 路由配置
├── App.tsx           # 应用根组件
└── main.tsx          # 应用入口
```

## 开发规范

详见: `docs/前端架构设计文档.md`

核心要点:
- 使用TypeScript严格模式
- 组件按展示/容器分离
- 使用函数式组件和Hooks
- 遵循React最佳实践
- 保持代码简洁清晰

## 环境要求

- Node.js >= 20.x
- npm >= 10 或 pnpm >= 8
