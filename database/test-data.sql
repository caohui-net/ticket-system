-- ========================================
-- 工单管理系统 - 测试数据初始化
-- ========================================
-- 用途: 为开发和测试环境提供初始数据
-- ========================================

-- 1. 清空现有数据（开发环境）
TRUNCATE TABLE user_roles RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
TRUNCATE TABLE roles RESTART IDENTITY CASCADE;

-- 2. 插入角色数据
INSERT INTO roles (role_code, role_name, description, is_system, status) VALUES
('CREATOR', '工单创建者', '可以创建和查看自己的工单', 1, 1),
('HANDLER', '处理人员', '可以处理分配给自己的工单', 1, 1),
('REVIEWER', '部门主管', '可以审核工单处理结果', 1, 1),
('APPROVER', '分管领导', '可以进行二级审批', 1, 1),
('ADMIN', '系统管理员', '可以管理所有工单和用户', 1, 1),
('REPORTER', '报表查看者', '只读查看统计报表', 1, 1);

-- 3. 插入测试用户（密码均为: Password123!）
-- 密码哈希值是 'Password123!' 的BCrypt加密结果（10轮）
-- $2b$10$5Z8F6Q7XqHJK5aXm.YYwH.YwRn0gYYp8z0Q9XqHJK5aXm.YYwH.YY (示例，实际需要通过代码生成)

INSERT INTO users (username, password, real_name, email, phone, department, status) VALUES
('admin', '$2b$10$YourHashedPasswordHere1', '系统管理员', 'admin@example.com', '13800138001', 'IT部', 1),
('zhangsan', '$2b$10$YourHashedPasswordHere2', '张三', 'zhangsan@example.com', '13800138002', '技术部', 1),
('lisi', '$2b$10$YourHashedPasswordHere3', '李四', 'lisi@example.com', '13800138003', '技术部', 1),
('wangwu', '$2b$10$YourHashedPasswordHere4', '王五', 'wangwu@example.com', '13800138004', '市场部', 1),
('zhaoliu', '$2b$10$YourHashedPasswordHere5', '赵六', 'zhaoliu@example.com', '13800138005', '人事部', 1);

-- 4. 分配用户角色
-- admin: 系统管理员
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 5); -- admin -> ADMIN

-- zhangsan: 工单创建者
INSERT INTO user_roles (user_id, role_id) VALUES
(2, 1); -- zhangsan -> CREATOR

-- lisi: 处理人员
INSERT INTO user_roles (user_id, role_id) VALUES
(3, 2); -- lisi -> HANDLER

-- wangwu: 部门主管（审核人）
INSERT INTO user_roles (user_id, role_id) VALUES
(4, 3); -- wangwu -> REVIEWER

-- zhaoliu: 分管领导（审批人）
INSERT INTO user_roles (user_id, role_id) VALUES
(5, 4); -- zhaoliu -> APPROVER

-- 5. 验证数据
SELECT
  u.user_id,
  u.username,
  u.real_name,
  u.email,
  u.department,
  r.role_code,
  r.role_name
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.role_id
ORDER BY u.user_id;

-- ========================================
-- 说明
-- ========================================
--
-- 由于密码需要通过BCrypt加密，建议通过以下方式创建测试用户：
--
-- 方式1: 使用API注册接口
-- POST /api/v1/auth/register
--
-- 方式2: 使用Node.js脚本生成密码哈希
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('Password123!', 10);
-- console.log(hash);
--
-- 方式3: 创建数据库种子脚本（推荐）
-- 参见: prisma/seed.ts
-- ========================================
