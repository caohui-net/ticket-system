-- ========================================
-- 工单管理系统 - 初始化数据脚本
-- ========================================
-- 版本: v1.0
-- 适用数据库: PostgreSQL 15+ / MySQL 8.0+
-- 字符集: UTF8 / UTF8MB4
-- 创建日期: 2026-09-06
-- 说明: 本脚本包含系统运行所需的初始数据
-- ========================================

-- 注意：执行本脚本前，请先执行 schema-postgres.sql 或 schema-mysql.sql

-- ========================================
-- 1. 插入角色数据
-- ========================================

-- 清空现有角色数据（可选，谨慎使用）
-- DELETE FROM user_roles;
-- DELETE FROM roles;

-- 插入6个系统角色
INSERT INTO roles (role_code, role_name, description, is_system, status) VALUES
('CREATOR', '工单创建者', '可以创建和查看自己的工单', 1, 1),
('HANDLER', '处理人员', '可以处理分配给自己的工单', 1, 1),
('REVIEWER', '部门主管', '可以审核工单处理结果', 1, 1),
('APPROVER', '分管领导', '可以进行二级审批', 1, 1),
('ADMIN', '系统管理员', '可以管理所有工单和用户', 1, 1),
('REPORTER', '报表查看者', '只读查看统计报表', 1, 1);

-- ========================================
-- 2. 插入系统配置数据
-- ========================================

-- 清空现有系统配置（可选，谨慎使用）
-- DELETE FROM system_settings;

-- 插入系统配置项
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_system) VALUES
-- 超时配置
('assign_timeout_hours', '24', 'int', '待分配工单超时时间（小时）', 1),
('process_timeout_hours', '48', 'int', '处理中工单超时时间（小时）', 1),
('review_timeout_hours', '72', 'int', '待审核工单超时时间（小时）', 1),

-- 附件配置
('max_attachment_size_mb', '10', 'int', '单个附件最大大小（MB）', 1),
('max_attachments_count', '20', 'int', '单个工单最大附件数量', 1),
('allowed_file_extensions', 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,zip,rar', 'string', '允许上传的文件扩展名', 1),

-- 通知配置
('enable_email_notification', 'true', 'bool', '是否启用邮件通知', 1),
('enable_sms_notification', 'false', 'bool', '是否启用短信通知', 1),
('notification_email_from', 'noreply@ticket-system.com', 'string', '通知邮件发送地址', 1),

-- 工单配置
('ticket_no_prefix', 'TK', 'string', '工单编号前缀', 1),
('auto_assign_enabled', 'false', 'bool', '是否启用自动分配', 1),
('default_priority', 'medium', 'string', '默认工单优先级（urgent/high/medium/low）', 1),

-- 安全配置
('max_login_attempts', '5', 'int', '最大登录尝试次数', 1),
('account_lockout_minutes', '15', 'int', '账号锁定时长（分钟）', 1),
('session_timeout_minutes', '30', 'int', '会话超时时间（分钟）', 1),
('password_min_length', '8', 'int', '密码最小长度', 1),

-- 系统配置
('system_name', '工单管理系统', 'string', '系统名称', 1),
('system_version', '1.0.0', 'string', '系统版本', 1),
('maintenance_mode', 'false', 'bool', '维护模式（true=启用，false=关闭）', 1);

-- ========================================
-- 3. 插入系统管理员账号
-- ========================================

-- 注意：密码为 "Admin@123456" 的 BCrypt 加密
-- BCrypt 轮次：10
-- 实际部署时，请通过应用层生成新的密码哈希

-- PostgreSQL 版本
-- 如果是 PostgreSQL，使用以下语句：
INSERT INTO users (username, password, real_name, email, department, status)
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye.L6MZkXOlRfjkC.5JmxWqZq7vXZqLDC',
  '系统管理员',
  'admin@example.com',
  'IT部',
  1
) ON CONFLICT (username) DO NOTHING;

-- MySQL 版本
-- 如果是 MySQL，使用以下语句（注释掉上面的 PostgreSQL 版本）：
-- INSERT IGNORE INTO users (username, password, real_name, email, department, status)
-- VALUES (
--   'admin',
--   '$2a$10$N9qo8uLOickgx2ZMRZoMye.L6MZkXOlRfjkC.5JmxWqZq7vXZqLDC',
--   '系统管理员',
--   'admin@example.com',
--   'IT部',
--   1
-- );

-- 为管理员分配 ADMIN 角色
-- PostgreSQL 版本
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u, roles r
WHERE u.username = 'admin' AND r.role_code = 'ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- MySQL 版本（注释掉上面的 PostgreSQL 版本）：
-- INSERT IGNORE INTO user_roles (user_id, role_id)
-- SELECT u.user_id, r.role_id
-- FROM users u, roles r
-- WHERE u.username = 'admin' AND r.role_code = 'ADMIN';

-- ========================================
-- 4. 插入工单类别数据
-- ========================================

-- 注意：工单类别可以根据实际业务需求调整
-- 这里提供常见的工单类别示例

-- 由于 tickets 表的 category 字段是 VARCHAR，不是外键关系
-- 因此这里只是作为参考数据，不需要单独的表
-- 实际使用时，可以通过枚举或配置项管理

-- 如果需要单独的类别表，可以创建以下结构（可选）：

-- PostgreSQL 版本
CREATE TABLE IF NOT EXISTS ticket_categories (
  category_id SERIAL PRIMARY KEY,
  category_code VARCHAR(50) NOT NULL UNIQUE,
  category_name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  icon VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ticket_categories IS '工单类别表（可选）';
COMMENT ON COLUMN ticket_categories.category_id IS '类别ID（主键）';
COMMENT ON COLUMN ticket_categories.category_code IS '类别代码（唯一）';
COMMENT ON COLUMN ticket_categories.category_name IS '类别名称';
COMMENT ON COLUMN ticket_categories.description IS '类别描述';
COMMENT ON COLUMN ticket_categories.icon IS '图标';
COMMENT ON COLUMN ticket_categories.sort_order IS '排序顺序';
COMMENT ON COLUMN ticket_categories.is_active IS '是否启用';

-- MySQL 版本（注释掉上面的 PostgreSQL 版本）：
-- CREATE TABLE IF NOT EXISTS ticket_categories (
--   category_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
--   category_code VARCHAR(50) NOT NULL UNIQUE,
--   category_name VARCHAR(50) NOT NULL,
--   description VARCHAR(200),
--   icon VARCHAR(50),
--   sort_order INT NOT NULL DEFAULT 0,
--   is_active TINYINT(1) NOT NULL DEFAULT 1,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单类别表（可选）';

-- 插入工单类别数据
INSERT INTO ticket_categories (category_code, category_name, description, icon, sort_order, is_active) VALUES
('tech_support', '技术支持', '软件问题、网络问题、系统故障', 'icon-tech', 1, 1),
('device_repair', '设备报修', '硬件故障、设备维护', 'icon-device', 2, 1),
('admin_affairs', '行政事务', '办公用品申请、场地预约', 'icon-admin', 3, 1),
('consultation', '咨询问题', '业务咨询、流程咨询', 'icon-help', 4, 1),
('complaint', '投诉建议', '服务投诉、改进建议', 'icon-feedback', 5, 1),
('other', '其他', '其他类型工单', 'icon-other', 99, 1);

-- ========================================
-- 5. 插入示例用户（可选，仅用于开发测试）
-- ========================================

-- 注意：生产环境请删除或注释掉本节

-- 插入测试用户（密码统一为 Test@123456）
-- PostgreSQL 版本
INSERT INTO users (username, password, real_name, email, department, status) VALUES
('user001', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '张三', 'zhangsan@example.com', 'IT部', 1),
('user002', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '李四', 'lisi@example.com', '人事部', 1),
('user003', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '王五', 'wangwu@example.com', '财务部', 1),
('user004', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '赵六', 'zhaoliu@example.com', 'IT部', 1),
('manager01', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '部门主管', 'manager@example.com', 'IT部', 1)
ON CONFLICT (username) DO NOTHING;

-- MySQL 版本（注释掉上面的 PostgreSQL 版本）：
-- INSERT IGNORE INTO users (username, password, real_name, email, department, status) VALUES
-- ('user001', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '张三', 'zhangsan@example.com', 'IT部', 1),
-- ('user002', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '李四', 'lisi@example.com', '人事部', 1),
-- ('user003', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '王五', 'wangwu@example.com', '财务部', 1),
-- ('user004', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '赵六', 'zhaoliu@example.com', 'IT部', 1),
-- ('manager01', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '部门主管', 'manager@example.com', 'IT部', 1);

-- 为测试用户分配角色
-- PostgreSQL 版本
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u, roles r
WHERE (u.username = 'user001' AND r.role_code = 'CREATOR')
   OR (u.username = 'user002' AND r.role_code = 'CREATOR')
   OR (u.username = 'user003' AND r.role_code = 'CREATOR')
   OR (u.username = 'user004' AND r.role_code = 'HANDLER')
   OR (u.username = 'manager01' AND r.role_code = 'REVIEWER')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- MySQL 版本（注释掉上面的 PostgreSQL 版本）：
-- INSERT IGNORE INTO user_roles (user_id, role_id)
-- SELECT u.user_id, r.role_id
-- FROM users u, roles r
-- WHERE (u.username = 'user001' AND r.role_code = 'CREATOR')
--    OR (u.username = 'user002' AND r.role_code = 'CREATOR')
--    OR (u.username = 'user003' AND r.role_code = 'CREATOR')
--    OR (u.username = 'user004' AND r.role_code = 'HANDLER')
--    OR (u.username = 'manager01' AND r.role_code = 'REVIEWER');

-- ========================================
-- 6. 插入示例工单数据（可选，仅用于开发测试）
-- ========================================

-- 注意：生产环境请删除或注释掉本节

-- 插入测试工单
-- PostgreSQL 版本
INSERT INTO tickets (
  ticket_no, title, description, category, priority, status,
  creator_id, assignee_id, reviewer_id,
  expected_finish_time, created_at
)
SELECT
  'TK202609060001',
  '办公电脑无法启动',
  '今天早上来办公室，发现电脑无法正常开机，按下电源键后指示灯亮了一下就熄灭了，怀疑是硬件故障。',
  'device_repair',
  'high',
  'processing',
  (SELECT user_id FROM users WHERE username = 'user001'),
  (SELECT user_id FROM users WHERE username = 'user004'),
  (SELECT user_id FROM users WHERE username = 'manager01'),
  CURRENT_TIMESTAMP + INTERVAL '2 days',
  CURRENT_TIMESTAMP - INTERVAL '1 hour'
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE ticket_no = 'TK202609060001');

-- MySQL 版本（注释掉上面的 PostgreSQL 版本）：
-- INSERT INTO tickets (
--   ticket_no, title, description, category, priority, status,
--   creator_id, assignee_id, reviewer_id,
--   expected_finish_time, created_at
-- )
-- SELECT
--   'TK202609060001',
--   '办公电脑无法启动',
--   '今天早上来办公室，发现电脑无法正常开机，按下电源键后指示灯亮了一下就熄灭了，怀疑是硬件故障。',
--   'device_repair',
--   'high',
--   'processing',
--   (SELECT user_id FROM users WHERE username = 'user001'),
--   (SELECT user_id FROM users WHERE username = 'user004'),
--   (SELECT user_id FROM users WHERE username = 'manager01'),
--   DATE_ADD(NOW(), INTERVAL 2 DAY),
--   DATE_SUB(NOW(), INTERVAL 1 HOUR)
-- FROM DUAL
-- WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE ticket_no = 'TK202609060001');

-- 插入更多测试工单
-- PostgreSQL 版本
INSERT INTO tickets (
  ticket_no, title, description, category, priority, status,
  creator_id, expected_finish_time, created_at
)
SELECT
  'TK202609060002',
  '申请更换办公椅',
  '当前使用的办公椅已经使用了5年，椅子靠背损坏，希望能够更换新的办公椅。',
  'admin_affairs',
  'low',
  'pending_assign',
  (SELECT user_id FROM users WHERE username = 'user002'),
  CURRENT_TIMESTAMP + INTERVAL '5 days',
  CURRENT_TIMESTAMP - INTERVAL '30 minutes'
WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE ticket_no = 'TK202609060002');

-- MySQL 版本（注释掉上面的 PostgreSQL 版本）：
-- INSERT INTO tickets (
--   ticket_no, title, description, category, priority, status,
--   creator_id, expected_finish_time, created_at
-- )
-- SELECT
--   'TK202609060002',
--   '申请更换办公椅',
--   '当前使用的办公椅已经使用了5年，椅子靠背损坏，希望能够更换新的办公椅。',
--   'admin_affairs',
--   'low',
--   'pending_assign',
--   (SELECT user_id FROM users WHERE username = 'user002'),
--   DATE_ADD(NOW(), INTERVAL 5 DAY),
--   DATE_SUB(NOW(), INTERVAL 30 MINUTE)
-- FROM DUAL
-- WHERE NOT EXISTS (SELECT 1 FROM tickets WHERE ticket_no = 'TK202609060002');

-- ========================================
-- 7. 验证数据插入
-- ========================================

-- 查询角色数据
SELECT '=== 角色数据 ===' AS info;
SELECT role_id, role_code, role_name, is_system, status FROM roles ORDER BY role_id;

-- 查询系统配置数据
SELECT '=== 系统配置（前10条） ===' AS info;
SELECT setting_id, setting_key, setting_value, setting_type FROM system_settings ORDER BY setting_id LIMIT 10;

-- 查询用户数据
SELECT '=== 用户数据 ===' AS info;
SELECT user_id, username, real_name, email, department, status FROM users ORDER BY user_id;

-- 查询用户角色关联
SELECT '=== 用户角色关联 ===' AS info;
SELECT
  ur.id,
  u.username,
  u.real_name,
  r.role_code,
  r.role_name
FROM user_roles ur
INNER JOIN users u ON ur.user_id = u.user_id
INNER JOIN roles r ON ur.role_id = r.role_id
ORDER BY ur.id;

-- 查询工单类别（如果创建了类别表）
SELECT '=== 工单类别 ===' AS info;
SELECT category_id, category_code, category_name, description, is_active
FROM ticket_categories
ORDER BY sort_order;

-- 查询测试工单（如果插入了）
SELECT '=== 测试工单 ===' AS info;
SELECT
  ticket_id,
  ticket_no,
  title,
  category,
  priority,
  status,
  creator_id
FROM tickets
ORDER BY ticket_id;

-- ========================================
-- 8. 统计信息
-- ========================================

SELECT '=== 初始化统计 ===' AS info;

-- PostgreSQL 版本
SELECT
  '角色总数' AS item,
  COUNT(*) AS count
FROM roles
UNION ALL
SELECT
  '用户总数' AS item,
  COUNT(*) AS count
FROM users
UNION ALL
SELECT
  '用户角色关联总数' AS item,
  COUNT(*) AS count
FROM user_roles
UNION ALL
SELECT
  '系统配置总数' AS item,
  COUNT(*) AS count
FROM system_settings
UNION ALL
SELECT
  '工单类别总数' AS item,
  COUNT(*) AS count
FROM ticket_categories
UNION ALL
SELECT
  '工单总数' AS item,
  COUNT(*) AS count
FROM tickets;

-- MySQL 版本（注释掉上面的 PostgreSQL 版本）：
-- SELECT '角色总数' AS item, COUNT(*) AS count FROM roles
-- UNION ALL
-- SELECT '用户总数' AS item, COUNT(*) AS count FROM users
-- UNION ALL
-- SELECT '用户角色关联总数' AS item, COUNT(*) AS count FROM user_roles
-- UNION ALL
-- SELECT '系统配置总数' AS item, COUNT(*) AS count FROM system_settings
-- UNION ALL
-- SELECT '工单类别总数' AS item, COUNT(*) AS count FROM ticket_categories
-- UNION ALL
-- SELECT '工单总数' AS item, COUNT(*) AS count FROM tickets;

-- ========================================
-- 初始化完成
-- ========================================

SELECT '========================================' AS '';
SELECT '数据初始化完成！' AS '';
SELECT '========================================' AS '';
SELECT '提示：' AS '';
SELECT '1. 默认管理员账号: admin / Admin@123456' AS '';
SELECT '2. 测试用户账号: user001~user004 / Test@123456' AS '';
SELECT '3. 生产环境请删除或禁用测试账号' AS '';
SELECT '4. 请立即修改默认密码' AS '';
SELECT '========================================' AS '';
