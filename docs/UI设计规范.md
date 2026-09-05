# 工单管理系统 - UI设计规范

**文档版本**: v1.0  
**创建日期**: 2026-09-06  
**项目名称**: 工单管理系统  
**前端架构师**: frontend-architect

---

## 目录

1. [设计原则](#1-设计原则)
2. [色彩规范](#2-色彩规范)
3. [字体规范](#3-字体规范)
4. [间距规范](#4-间距规范)
5. [组件规范](#5-组件规范)
6. [响应式设计](#6-响应式设计)
7. [图标规范](#7-图标规范)
8. [动效规范](#8-动效规范)

---

## 1. 设计原则

### 1.1 核心理念

**简洁高效**
- 界面简洁清晰，信息层级分明
- 减少用户操作步骤，提高工作效率
- 避免过度设计，专注核心功能

**一致性**
- 视觉风格统一
- 交互模式一致
- 用语规范统一

**易用性**
- 符合用户使用习惯
- 重要功能易于发现
- 错误提示清晰友好

**可访问性**
- 符合WCAG 2.1 AA标准
- 支持键盘导航
- 良好的色彩对比度

---

## 2. 色彩规范

### 2.1 品牌色

**主色 (Primary)**
- 色值: `#1677FF` (Ant Design Blue)
- 用途: 主要按钮、重要信息、链接
- 使用场景: 创建按钮、提交按钮、活动标签

**辅助色**
- 色值: `#00B96B` (Success Green)
- 用途: 成功状态、已完成标识
- 使用场景: 成功提示、完成状态徽章

### 2.2 功能色

| 功能 | 色值 | 使用场景 |
|------|------|---------|
| 成功 (Success) | `#52C41A` | 操作成功提示、已完成状态 |
| 警告 (Warning) | `#FAAD14` | 警告提示、待处理状态 |
| 错误 (Error) | `#FF4D4F` | 错误提示、驳回状态、紧急优先级 |
| 信息 (Info) | `#1677FF` | 普通提示、处理中状态 |

### 2.3 中性色

**文字颜色**
```css
/* 主要文字 */
--text-primary: rgba(0, 0, 0, 0.88);

/* 次要文字 */
--text-secondary: rgba(0, 0, 0, 0.65);

/* 辅助文字 */
--text-tertiary: rgba(0, 0, 0, 0.45);

/* 禁用文字 */
--text-disabled: rgba(0, 0, 0, 0.25);
```

**背景颜色**
```css
/* 主背景 */
--bg-base: #FFFFFF;

/* 容器背景 */
--bg-container: #FFFFFF;

/* 布局背景 */
--bg-layout: #F5F5F5;

/* 悬浮背景 */
--bg-spotlight: #FAFAFA;
```

**边框颜色**
```css
/* 默认边框 */
--border-base: #D9D9D9;

/* 分割线 */
--border-split: rgba(5, 5, 5, 0.06);

/* 悬浮边框 */
--border-hover: #40A9FF;
```

### 2.4 状态色映射

**工单状态色彩**
| 状态 | 颜色 | 色值 |
|------|------|------|
| 待分配 | 蓝色 | `#1677FF` |
| 处理中 | 橙色 | `#FAAD14` |
| 待审核 | 紫色 | `#722ED1` |
| 已驳回 | 红色 | `#FF4D4F` |
| 已完成 | 绿色 | `#52C41A` |
| 已关闭 | 灰色 | `#8C8C8C` |
| 已取消 | 灰色 | `#D9D9D9` |

**优先级色彩**
| 优先级 | 颜色 | 色值 |
|--------|------|------|
| 紧急 | 红色 | `#FF4D4F` |
| 高 | 橙色 | `#FA8C16` |
| 中 | 蓝色 | `#1677FF` |
| 低 | 灰色 | `#8C8C8C` |

---

## 3. 字体规范

### 3.1 字体家族

**优先级顺序**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             Roboto, 'Helvetica Neue', Arial,
             'Noto Sans', sans-serif, 
             'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
             'Noto Color Emoji';
```

**中文字体**
- 优先使用系统默认字体
- macOS: PingFang SC
- Windows: Microsoft YaHei
- Linux: Noto Sans CJK SC

### 3.2 字号规范

| 级别 | 字号 | 行高 | 用途 |
|------|------|------|------|
| H1 | 38px | 46px | 页面大标题 |
| H2 | 30px | 38px | 模块标题 |
| H3 | 24px | 32px | 卡片标题 |
| H4 | 20px | 28px | 小节标题 |
| H5 | 16px | 24px | 组标题 |
| Body Large | 16px | 24px | 重要正文 |
| Body | 14px | 22px | 普通正文 |
| Body Small | 12px | 20px | 辅助文字 |
| Caption | 12px | 20px | 说明文字 |

### 3.3 字重规范

| 字重 | 值 | 用途 |
|------|-----|------|
| Regular | 400 | 正文内容 |
| Medium | 500 | 次要标题、强调文字 |
| Semibold | 600 | 重要标题、按钮文字 |
| Bold | 700 | 特别强调（少用） |

---

## 4. 间距规范

### 4.1 基础间距单位

**8px 栅格系统**
- 基础单位: 8px
- 所有间距都是8的倍数
- 保持视觉统一性

```css
/* 间距变量 */
--spacing-xs: 4px;   /* 0.5x */
--spacing-sm: 8px;   /* 1x */
--spacing-md: 16px;  /* 2x */
--spacing-lg: 24px;  /* 3x */
--spacing-xl: 32px;  /* 4x */
--spacing-xxl: 48px; /* 6x */
```

### 4.2 组件内间距

| 场景 | 间距 | 说明 |
|------|------|------|
| 图标与文字 | 8px | Icon + Text |
| 按钮内边距 | 16px 32px | 上下 左右 |
| 表单项间距 | 24px | Form Item之间 |
| 卡片内边距 | 24px | Card Padding |
| 列表项高度 | 48px | List Item Height |
| 输入框高度 | 32px / 40px | Small / Default |

### 4.3 布局间距

| 层级 | 间距 | 用途 |
|------|------|------|
| 页面边距 | 24px | Page Padding |
| 模块间距 | 24px | Section间距 |
| 卡片间距 | 16px | Card之间 |
| 栅格间距 | 16px | Grid Gutter |

### 4.4 响应式间距

```css
/* 移动端减小间距 */
@media (max-width: 768px) {
  --page-padding: 16px;
  --section-gap: 16px;
  --card-gap: 12px;
}

/* 桌面端正常间距 */
@media (min-width: 769px) {
  --page-padding: 24px;
  --section-gap: 24px;
  --card-gap: 16px;
}
```

---

## 5. 组件规范

### 5.1 按钮 (Button)

**尺寸规范**
| 尺寸 | 高度 | 内边距 | 字号 | 使用场景 |
|------|------|--------|------|---------|
| Large | 40px | 20px 32px | 16px | 主要操作 |
| Default | 32px | 8px 16px | 14px | 常规操作 |
| Small | 24px | 4px 8px | 12px | 次要操作 |

**类型规范**
```typescript
// Primary - 主要按钮
<Button type="primary">创建工单</Button>

// Default - 次要按钮
<Button>取消</Button>

// Dashed - 虚线按钮
<Button type="dashed">添加</Button>

// Text - 文字按钮
<Button type="text">详情</Button>

// Link - 链接按钮
<Button type="link">查看更多</Button>
```

**按钮组合**
- 主要操作在右侧
- 取消按钮在左侧
- 按钮之间间距8px

### 5.2 表单 (Form)

**表单项布局**
```typescript
<Form layout="vertical">  {/* 推荐:标签在上 */}
  <Form.Item label="工单标题" required>
    <Input placeholder="请输入工单标题" />
  </Form.Item>
</Form>
```

**输入框规范**
- 默认高度: 32px
- 大尺寸: 40px (重要表单)
- 小尺寸: 24px (搜索框、筛选)
- Placeholder颜色: `rgba(0, 0, 0, 0.25)`

**必填标识**
- 使用红色星号(*)
- 星号在标签前
- 错误提示红色文字

### 5.3 表格 (Table)

**表格规范**
```typescript
<Table
  size="middle"           // 中等密度
  bordered={false}        // 无外边框
  pagination={{
    pageSize: 20,         // 每页20条
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
  }}
/>
```

**列宽建议**
| 列类型 | 宽度 | 说明 |
|--------|------|------|
| 复选框 | 48px | 固定 |
| 序号 | 60px | 固定 |
| 操作列 | 120-200px | 固定 |
| 状态 | 100px | 固定 |
| 时间 | 180px | 固定 |
| 标题 | 自适应 | flex: 1 |

### 5.4 卡片 (Card)

**卡片样式**
```typescript
<Card
  bordered={true}         // 有边框
  hoverable={true}        // 可悬浮
  style={{
    borderRadius: '8px',  // 圆角
  }}
>
  内容
</Card>
```

**卡片内边距**
- 默认: 24px
- 小卡片: 16px
- 无内边距: 0 (自定义内容)

### 5.5 徽章 (Badge)

**状态徽章**
```typescript
// 工单状态
<Badge status="processing" text="处理中" />
<Badge status="success" text="已完成" />
<Badge status="error" text="已驳回" />
<Badge status="default" text="已关闭" />

// 优先级标签
<Tag color="error">紧急</Tag>
<Tag color="warning">高</Tag>
<Tag color="default">中</Tag>
<Tag color="default">低</Tag>
```

### 5.6 模态框 (Modal)

**尺寸规范**
| 类型 | 宽度 | 使用场景 |
|------|------|---------|
| 小 | 416px | 确认对话框 |
| 默认 | 520px | 表单对话框 |
| 大 | 800px | 详情展示 |
| 全屏 | 90vw | 复杂内容 |

**按钮位置**
- 确认按钮在右
- 取消按钮在左
- 按钮间距8px

---

## 6. 响应式设计

### 6.1 断点规范

```css
/* 移动设备 */
@media (max-width: 576px) {
  /* xs: 超小屏 */
}

/* 平板设备 */
@media (min-width: 577px) and (max-width: 768px) {
  /* sm: 小屏 */
}

/* 小型笔记本 */
@media (min-width: 769px) and (max-width: 992px) {
  /* md: 中屏 */
}

/* 桌面设备 */
@media (min-width: 993px) and (max-width: 1200px) {
  /* lg: 大屏 */
}

/* 大屏设备 */
@media (min-width: 1201px) {
  /* xl: 超大屏 */
}
```

### 6.2 栅格系统

**24列栅格**
```typescript
<Row gutter={16}>
  <Col xs={24} sm={12} md={8} lg={6} xl={4}>
    内容
  </Col>
</Row>
```

**响应式配置**
| 设备 | 栅格数 | 间距 |
|------|--------|------|
| 手机 | 24列 | 8px |
| 平板 | 12列 | 16px |
| 桌面 | 8列 | 16px |

### 6.3 移动端适配

**隐藏/显示**
```css
/* 移动端隐藏 */
.desktop-only {
  display: block;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }
}

/* 移动端显示 */
.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .mobile-only {
    display: block;
  }
}
```

**触摸优化**
- 按钮最小尺寸: 44x44px
- 列表项最小高度: 48px
- 增大点击区域

---

## 7. 图标规范

### 7.1 图标库

**使用Ant Design Icons**
```typescript
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
```

### 7.2 图标尺寸

| 场景 | 尺寸 | 说明 |
|------|------|------|
| 导航图标 | 20px | 侧边栏菜单 |
| 按钮图标 | 16px | 按钮内图标 |
| 列表图标 | 16px | 列表项图标 |
| 大图标 | 24-32px | 空状态、引导 |

### 7.3 图标颜色

```css
/* 默认图标 */
.icon-default {
  color: rgba(0, 0, 0, 0.45);
}

/* 主要图标 */
.icon-primary {
  color: #1677FF;
}

/* 成功图标 */
.icon-success {
  color: #52C41A;
}

/* 警告图标 */
.icon-warning {
  color: #FAAD14;
}

/* 错误图标 */
.icon-error {
  color: #FF4D4F;
}
```

### 7.4 常用图标映射

| 功能 | 图标 | Icon组件 |
|------|------|----------|
| 创建 | ➕ | `PlusOutlined` |
| 编辑 | ✏️ | `EditOutlined` |
| 删除 | 🗑️ | `DeleteOutlined` |
| 搜索 | 🔍 | `SearchOutlined` |
| 筛选 | 🎯 | `FilterOutlined` |
| 导出 | 📤 | `ExportOutlined` |
| 刷新 | 🔄 | `ReloadOutlined` |
| 设置 | ⚙️ | `SettingOutlined` |
| 关闭 | ❌ | `CloseOutlined` |
| 成功 | ✅ | `CheckCircleOutlined` |
| 警告 | ⚠️ | `ExclamationCircleOutlined` |
| 错误 | ❌ | `CloseCircleOutlined` |

---

## 8. 动效规范

### 8.1 动画时长

```css
/* 动画时长变量 */
--motion-duration-fast: 100ms;      /* 快速 */
--motion-duration-mid: 200ms;       /* 中速 */
--motion-duration-slow: 300ms;      /* 慢速 */
```

| 场景 | 时长 | 说明 |
|------|------|------|
| 按钮悬浮 | 100ms | 即时反馈 |
| 下拉展开 | 200ms | 常规动画 |
| 模态框 | 300ms | 平滑过渡 |
| 页面切换 | 300ms | 页面动画 |

### 8.2 缓动函数

```css
/* 标准缓动 */
--motion-ease-in: cubic-bezier(0.55, 0, 1, 0.45);
--motion-ease-out: cubic-bezier(0, 0, 0.2, 1);
--motion-ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);
```

### 8.3 常用动画

**淡入淡出**
```css
.fade-enter {
  opacity: 0;
}
.fade-enter-active {
  opacity: 1;
  transition: opacity 200ms ease-out;
}
.fade-exit {
  opacity: 1;
}
.fade-exit-active {
  opacity: 0;
  transition: opacity 200ms ease-in;
}
```

**滑入滑出**
```css
.slide-up-enter {
  transform: translateY(100%);
}
.slide-up-enter-active {
  transform: translateY(0);
  transition: transform 300ms ease-out;
}
```

**悬浮效果**
```css
.card-hover {
  transition: all 200ms ease-out;
}
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

---

## 9. 主题配置

### 9.1 Ant Design主题定制

```typescript
// App.tsx
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

const customTheme = {
  token: {
    // 品牌色
    colorPrimary: '#1677FF',
    
    // 圆角
    borderRadius: 8,
    
    // 字体
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
    
    // 间距
    marginXS: 8,
    marginSM: 12,
    margin: 16,
    marginMD: 20,
    marginLG: 24,
    marginXL: 32,
  },
  
  components: {
    Button: {
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 24,
    },
    Table: {
      headerBg: '#FAFAFA',
      rowHoverBg: '#F5F5F5',
    },
  },
};

<ConfigProvider theme={customTheme} locale={zhCN}>
  <App />
</ConfigProvider>
```

### 9.2 CSS变量

```css
/* styles/variables.css */
:root {
  /* 品牌色 */
  --color-primary: #1677FF;
  --color-success: #52C41A;
  --color-warning: #FAAD14;
  --color-error: #FF4D4F;
  
  /* 文字色 */
  --text-primary: rgba(0, 0, 0, 0.88);
  --text-secondary: rgba(0, 0, 0, 0.65);
  --text-tertiary: rgba(0, 0, 0, 0.45);
  
  /* 背景色 */
  --bg-base: #FFFFFF;
  --bg-layout: #F5F5F5;
  
  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* 圆角 */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-md: 0 1px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

---

## 10. 设计交付物

### 10.1 设计资源

**Figma设计稿** (待设计师提供)
- 完整页面设计
- 组件库
- 交互原型

**设计切图**
- Logo
- 图标
- 插图

### 10.2 前端实现清单

- [ ] 全局样式配置
- [ ] Ant Design主题定制
- [ ] CSS变量定义
- [ ] 通用组件开发
- [ ] 响应式适配
- [ ] 暗色模式支持(可选)

---

**文档结束**