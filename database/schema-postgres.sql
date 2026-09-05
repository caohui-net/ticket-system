-- ========================================
-- 工单管理系统 - PostgreSQL 数据库架构
-- ========================================
-- 版本: v1.0
-- 数据库: PostgreSQL 15+
-- 字符集: UTF8
-- 创建日期: 2026-09-06
-- ========================================

-- 1. 创建数据库（如果需要）
-- CREATE DATABASE ticket_system
--   WITH ENCODING='UTF8'
--   LC_COLLATE='zh_CN.UTF-8'
--   LC_CTYPE='zh_CN.UTF-8'
--   TEMPLATE=template0;

-- \c ticket_system;

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- ========================================
-- 2. 创建枚举类型
-- ========================================

-- 工单状态枚举
CREATE TYPE ticket_status_enum AS ENUM (
  'draft',
  'pending_assign',
  'processing',
  'pending_review',
  'rejected',
  'completed',
  'closed',
  'cancelled'
);

-- 优先级枚举
CREATE TYPE priority_enum AS ENUM (
  'urgent',
  'high',
  'medium',
  'low'
);

-- 附件上传类型枚举
CREATE TYPE upload_type_enum AS ENUM (
  'problem',
  'solution'
);

-- 分配类型枚举
CREATE TYPE assignment_type_enum AS ENUM (
  'assign',
  'reassign'
);

-- 通知方式枚举（使用数组代替MySQL的SET）
-- 通知方式: system, email, sms

-- ========================================
-- 3. 创建表
-- ========================================

-- 3.1 角色表
CREATE TABLE roles (
  role_id SERIAL PRIMARY KEY,
  role_code VARCHAR(50) NOT NULL UNIQUE,
  role_name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  permissions TEXT,
  is_system SMALLINT NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE roles IS '角色表';
COMMENT ON COLUMN roles.role_id IS '角色ID（主键）';
COMMENT ON COLUMN roles.role_code IS '角色代码（唯一）';
COMMENT ON COLUMN roles.role_name IS '角色名称';
COMMENT ON COLUMN roles.description IS '角色描述';
COMMENT ON COLUMN roles.permissions IS '权限列表（JSON格式）';
COMMENT ON COLUMN roles.is_system IS '是否系统内置角色（1=是，0=否）';
COMMENT ON COLUMN roles.status IS '状态（1=启用，0=禁用）';

-- 3.2 用户表
CREATE TABLE users (
  user_id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  real_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  department VARCHAR(50),
  avatar_url VARCHAR(500),
  status SMALLINT NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.user_id IS '用户ID（主键）';
COMMENT ON COLUMN users.username IS '用户名（唯一）';
COMMENT ON COLUMN users.password IS '密码（BCrypt加密）';
COMMENT ON COLUMN users.real_name IS '真实姓名';
COMMENT ON COLUMN users.email IS '邮箱（唯一）';
COMMENT ON COLUMN users.phone IS '手机号';
COMMENT ON COLUMN users.department IS '部门';
COMMENT ON COLUMN users.avatar_url IS '头像URL';
COMMENT ON COLUMN users.status IS '账号状态（1=启用，0=禁用）';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN users.last_login_ip IS '最后登录IP';
COMMENT ON COLUMN users.failed_login_attempts IS '失败登录次数';
COMMENT ON COLUMN users.locked_until IS '账号锁定截止时间';
COMMENT ON COLUMN users.deleted_at IS '软删除时间';

-- 3.3 用户角色关联表
CREATE TABLE user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_by BIGINT,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_user_role UNIQUE (user_id, role_id)
);

COMMENT ON TABLE user_roles IS '用户角色关联表';
COMMENT ON COLUMN user_roles.id IS '主键ID';
COMMENT ON COLUMN user_roles.user_id IS '用户ID（外键）';
COMMENT ON COLUMN user_roles.role_id IS '角色ID（外键）';
COMMENT ON COLUMN user_roles.assigned_by IS '分配人ID';
COMMENT ON COLUMN user_roles.assigned_at IS '分配时间';

-- 3.4 工单表
CREATE TABLE tickets (
  ticket_id BIGSERIAL PRIMARY KEY,
  ticket_no VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority priority_enum NOT NULL DEFAULT 'medium',
  status ticket_status_enum NOT NULL DEFAULT 'pending_assign',
  creator_id BIGINT NOT NULL,
  assignee_id BIGINT,
  reviewer_id BIGINT,
  approver_id BIGINT,
  expected_finish_time TIMESTAMP,
  actual_finish_time TIMESTAMP,
  processing_started_at TIMESTAMP,
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  closed_at TIMESTAMP,
  processing_result TEXT,
  review_comment TEXT,
  reject_reason TEXT,
  reject_count INTEGER NOT NULL DEFAULT 0 CHECK (reject_count >= 0),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  actual_work_hours NUMERIC(10, 2),
  is_overdue SMALLINT NOT NULL DEFAULT 0,
  is_urgent_notified SMALLINT NOT NULL DEFAULT 0,
  requires_second_approval SMALLINT NOT NULL DEFAULT 0,
  tags VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

COMMENT ON TABLE tickets IS '工单表';
COMMENT ON COLUMN tickets.ticket_id IS '工单ID（主键）';
COMMENT ON COLUMN tickets.ticket_no IS '工单编号（唯一）';
COMMENT ON COLUMN tickets.title IS '工单标题';
COMMENT ON COLUMN tickets.description IS '问题描述';
COMMENT ON COLUMN tickets.category IS '工单类别';
COMMENT ON COLUMN tickets.priority IS '优先级';
COMMENT ON COLUMN tickets.status IS '工单状态';
COMMENT ON COLUMN tickets.creator_id IS '创建人ID';
COMMENT ON COLUMN tickets.assignee_id IS '当前处理人ID';
COMMENT ON COLUMN tickets.reviewer_id IS '当前审核人ID';
COMMENT ON COLUMN tickets.approver_id IS '二级审批人ID';
COMMENT ON COLUMN tickets.expected_finish_time IS '期望完成时间';
COMMENT ON COLUMN tickets.actual_finish_time IS '实际完成时间';
COMMENT ON COLUMN tickets.processing_started_at IS '开始处理时间';
COMMENT ON COLUMN tickets.submitted_at IS '提交审核时间';
COMMENT ON COLUMN tickets.reviewed_at IS '审核完成时间';
COMMENT ON COLUMN tickets.closed_at IS '关闭时间';
COMMENT ON COLUMN tickets.processing_result IS '处理结果说明';
COMMENT ON COLUMN tickets.review_comment IS '审核意见';
COMMENT ON COLUMN tickets.reject_reason IS '驳回原因';
COMMENT ON COLUMN tickets.reject_count IS '驳回次数';
COMMENT ON COLUMN tickets.progress_percentage IS '处理进度（0-100）';
COMMENT ON COLUMN tickets.actual_work_hours IS '实际工时（小时）';
COMMENT ON COLUMN tickets.is_overdue IS '是否超期';
COMMENT ON COLUMN tickets.is_urgent_notified IS '是否已发送紧急通知';
COMMENT ON COLUMN tickets.requires_second_approval IS '是否需要二级审批';
COMMENT ON COLUMN tickets.tags IS '标签（JSON数组）';

-- 3.5 工单操作日志表
CREATE TABLE ticket_logs (
  log_id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  content TEXT,
  extra_data JSONB,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ticket_logs IS '工单操作日志表';
COMMENT ON COLUMN ticket_logs.log_id IS '日志ID（主键）';
COMMENT ON COLUMN ticket_logs.ticket_id IS '工单ID（外键）';
COMMENT ON COLUMN ticket_logs.user_id IS '操作人ID（外键）';
COMMENT ON COLUMN ticket_logs.action IS '操作类型';
COMMENT ON COLUMN ticket_logs.old_status IS '变更前状态';
COMMENT ON COLUMN ticket_logs.new_status IS '变更后状态';
COMMENT ON COLUMN ticket_logs.content IS '操作内容/备注';
COMMENT ON COLUMN ticket_logs.extra_data IS '额外数据（JSON格式）';
COMMENT ON COLUMN ticket_logs.ip_address IS '操作IP地址';
COMMENT ON COLUMN ticket_logs.user_agent IS '用户代理信息';
COMMENT ON COLUMN ticket_logs.created_at IS '操作时间';

-- 3.6 工单附件表
CREATE TABLE ticket_attachments (
  attachment_id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_extension VARCHAR(20) NOT NULL,
  upload_type upload_type_enum NOT NULL DEFAULT 'problem',
  uploader_id BIGINT NOT NULL,
  upload_stage VARCHAR(50) NOT NULL,
  is_deleted SMALLINT NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

COMMENT ON TABLE ticket_attachments IS '工单附件表';
COMMENT ON COLUMN ticket_attachments.attachment_id IS '附件ID（主键）';
COMMENT ON COLUMN ticket_attachments.ticket_id IS '工单ID（外键）';
COMMENT ON COLUMN ticket_attachments.file_name IS '文件名';
COMMENT ON COLUMN ticket_attachments.file_original_name IS '原始文件名';
COMMENT ON COLUMN ticket_attachments.file_path IS '文件存储路径';
COMMENT ON COLUMN ticket_attachments.file_size IS '文件大小（字节）';
COMMENT ON COLUMN ticket_attachments.file_type IS '文件MIME类型';
COMMENT ON COLUMN ticket_attachments.file_extension IS '文件扩展名';
COMMENT ON COLUMN ticket_attachments.upload_type IS '上传类型';
COMMENT ON COLUMN ticket_attachments.uploader_id IS '上传人ID（外键）';
COMMENT ON COLUMN ticket_attachments.upload_stage IS '上传阶段';
COMMENT ON COLUMN ticket_attachments.is_deleted IS '是否已删除';
COMMENT ON COLUMN ticket_attachments.uploaded_at IS '上传时间';
COMMENT ON COLUMN ticket_attachments.deleted_at IS '删除时间';

-- 3.7 工单分配记录表
CREATE TABLE ticket_assignments (
  assignment_id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL,
  assignee_id BIGINT NOT NULL,
  assigner_id BIGINT NOT NULL,
  assignment_type assignment_type_enum NOT NULL DEFAULT 'assign',
  assignment_reason VARCHAR(500),
  is_current SMALLINT NOT NULL DEFAULT 1,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unassigned_at TIMESTAMP
);

COMMENT ON TABLE ticket_assignments IS '工单分配记录表';
COMMENT ON COLUMN ticket_assignments.assignment_id IS '分配记录ID（主键）';
COMMENT ON COLUMN ticket_assignments.ticket_id IS '工单ID（外键）';
COMMENT ON COLUMN ticket_assignments.assignee_id IS '被分配人ID（外键）';
COMMENT ON COLUMN ticket_assignments.assigner_id IS '分配人ID（外键）';
COMMENT ON COLUMN ticket_assignments.assignment_type IS '分配类型';
COMMENT ON COLUMN ticket_assignments.assignment_reason IS '分配说明/重新分配原因';
COMMENT ON COLUMN ticket_assignments.is_current IS '是否当前有效';
COMMENT ON COLUMN ticket_assignments.assigned_at IS '分配时间';
COMMENT ON COLUMN ticket_assignments.unassigned_at IS '取消分配时间';

-- 3.8 通知表
CREATE TABLE notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL,
  sender_id BIGINT,
  ticket_id BIGINT,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  link_url VARCHAR(500),
  is_read SMALLINT NOT NULL DEFAULT 0,
  read_at TIMESTAMP,
  notification_method VARCHAR(50)[] NOT NULL DEFAULT '{system}',
  email_sent SMALLINT NOT NULL DEFAULT 0,
  email_sent_at TIMESTAMP,
  sms_sent SMALLINT NOT NULL DEFAULT 0,
  sms_sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expired_at TIMESTAMP
);

COMMENT ON TABLE notifications IS '通知表';
COMMENT ON COLUMN notifications.notification_id IS '通知ID（主键）';
COMMENT ON COLUMN notifications.recipient_id IS '接收人ID（外键）';
COMMENT ON COLUMN notifications.sender_id IS '发送人ID（外键，NULL表示系统）';
COMMENT ON COLUMN notifications.ticket_id IS '关联工单ID（外键）';
COMMENT ON COLUMN notifications.type IS '通知类型';
COMMENT ON COLUMN notifications.title IS '通知标题';
COMMENT ON COLUMN notifications.content IS '通知内容';
COMMENT ON COLUMN notifications.link_url IS '跳转链接';
COMMENT ON COLUMN notifications.is_read IS '是否已读';
COMMENT ON COLUMN notifications.read_at IS '阅读时间';
COMMENT ON COLUMN notifications.notification_method IS '通知方式（system/email/sms）';
COMMENT ON COLUMN notifications.email_sent IS '邮件是否已发送';
COMMENT ON COLUMN notifications.email_sent_at IS '邮件发送时间';
COMMENT ON COLUMN notifications.sms_sent IS '短信是否已发送';
COMMENT ON COLUMN notifications.sms_sent_at IS '短信发送时间';
COMMENT ON COLUMN notifications.created_at IS '创建时间';
COMMENT ON COLUMN notifications.expired_at IS '过期时间';

-- 3.9 系统配置表
CREATE TABLE system_settings (
  setting_id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(20) NOT NULL DEFAULT 'string',
  description VARCHAR(500),
  is_system SMALLINT NOT NULL DEFAULT 0,
  updated_by BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_settings IS '系统配置表';
COMMENT ON COLUMN system_settings.setting_id IS '配置ID（主键）';
COMMENT ON COLUMN system_settings.setting_key IS '配置键（唯一）';
COMMENT ON COLUMN system_settings.setting_value IS '配置值';
COMMENT ON COLUMN system_settings.setting_type IS '值类型';
COMMENT ON COLUMN system_settings.description IS '配置说明';
COMMENT ON COLUMN system_settings.is_system IS '是否系统配置';
COMMENT ON COLUMN system_settings.updated_by IS '最后更新人ID';
COMMENT ON COLUMN system_settings.created_at IS '创建时间';
COMMENT ON COLUMN system_settings.updated_at IS '更新时间';

-- ========================================
-- 4. 创建索引
-- ========================================

-- 4.1 roles 表索引
CREATE INDEX idx_roles_code ON roles(role_code);
CREATE INDEX idx_roles_status ON roles(status);

-- 4.2 users 表索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_department ON users(department);

-- 4.3 user_roles 表索引
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- 4.4 tickets 表索引
CREATE INDEX idx_tickets_no ON tickets(ticket_no);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_creator_id ON tickets(creator_id);
CREATE INDEX idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX idx_tickets_reviewer_id ON tickets(reviewer_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_deleted_at ON tickets(deleted_at);
CREATE INDEX idx_tickets_status_priority ON tickets(status, priority);
CREATE INDEX idx_tickets_assignee_status ON tickets(assignee_id, status);
CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_tickets_expected_time ON tickets(expected_finish_time);

-- 4.5 ticket_logs 表索引
CREATE INDEX idx_ticket_logs_ticket_id ON ticket_logs(ticket_id);
CREATE INDEX idx_ticket_logs_user_id ON ticket_logs(user_id);
CREATE INDEX idx_ticket_logs_action ON ticket_logs(action);
CREATE INDEX idx_ticket_logs_created_at ON ticket_logs(created_at);
CREATE INDEX idx_ticket_logs_ticket_created ON ticket_logs(ticket_id, created_at);

-- 4.6 ticket_attachments 表索引
CREATE INDEX idx_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX idx_attachments_uploader_id ON ticket_attachments(uploader_id);
CREATE INDEX idx_attachments_uploaded_at ON ticket_attachments(uploaded_at);
CREATE INDEX idx_attachments_is_deleted ON ticket_attachments(is_deleted);

-- 4.7 ticket_assignments 表索引
CREATE INDEX idx_assignments_ticket_id ON ticket_assignments(ticket_id);
CREATE INDEX idx_assignments_assignee_id ON ticket_assignments(assignee_id);
CREATE INDEX idx_assignments_is_current ON ticket_assignments(is_current);
CREATE INDEX idx_assignments_assigned_at ON ticket_assignments(assigned_at);
CREATE INDEX idx_assignments_ticket_current ON ticket_assignments(ticket_id, is_current);

-- 4.8 notifications 表索引
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_ticket_id ON notifications(ticket_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read);

-- 4.9 system_settings 表索引
CREATE INDEX idx_settings_key ON system_settings(setting_key);

-- ========================================
-- 5. 创建外键约束
-- ========================================

-- 5.1 user_roles 外键
ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_user_roles_assigner FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- 5.2 tickets 外键
ALTER TABLE tickets
  ADD CONSTRAINT fk_tickets_creator FOREIGN KEY (creator_id) REFERENCES users(user_id),
  ADD CONSTRAINT fk_tickets_assignee FOREIGN KEY (assignee_id) REFERENCES users(user_id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_tickets_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_tickets_approver FOREIGN KEY (approver_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- 5.3 ticket_logs 外键
ALTER TABLE ticket_logs
  ADD CONSTRAINT fk_logs_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id);

-- 5.4 ticket_attachments 外键
ALTER TABLE ticket_attachments
  ADD CONSTRAINT fk_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_attachments_uploader FOREIGN KEY (uploader_id) REFERENCES users(user_id);

-- 5.5 ticket_assignments 外键
ALTER TABLE ticket_assignments
  ADD CONSTRAINT fk_assignments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_assignments_assignee FOREIGN KEY (assignee_id) REFERENCES users(user_id),
  ADD CONSTRAINT fk_assignments_assigner FOREIGN KEY (assigner_id) REFERENCES users(user_id);

-- 5.6 notifications 外键
ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_notifications_sender FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_notifications_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE;

-- 5.7 system_settings 外键
ALTER TABLE system_settings
  ADD CONSTRAINT fk_settings_updater FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- ========================================
-- 6. 创建触发器（自动更新 updated_at）
-- ========================================

-- 触发器函数：更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用触发器到需要的表
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. 插入初始数据
-- ========================================

-- 7.1 插入角色数据
INSERT INTO roles (role_code, role_name, description, is_system, status) VALUES
('CREATOR', '工单创建者', '可以创建和查看自己的工单', 1, 1),
('HANDLER', '处理人员', '可以处理分配给自己的工单', 1, 1),
('REVIEWER', '部门主管', '可以审核工单处理结果', 1, 1),
('APPROVER', '分管领导', '可以进行二级审批', 1, 1),
('ADMIN', '系统管理员', '可以管理所有工单和用户', 1, 1),
('REPORTER', '报表查看者', '只读查看统计报表', 1, 1);

-- 7.2 插入系统配置数据
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_system) VALUES
('assign_timeout_hours', '24', 'int', '待分配工单超时时间（小时）', 1),
('process_timeout_hours', '48', 'int', '处理中工单超时时间（小时）', 1),
('review_timeout_hours', '72', 'int', '待审核工单超时时间（小时）', 1),
('max_attachment_size_mb', '10', 'int', '单个附件最大大小（MB）', 1),
('max_attachments_count', '20', 'int', '单个工单最大附件数量', 1),
('enable_email_notification', 'true', 'bool', '是否启用邮件通知', 1),
('enable_sms_notification', 'false', 'bool', '是否启用短信通知', 1),
('auto_assign_enabled', 'false', 'bool', '是否启用自动分配', 1),
('ticket_no_prefix', 'TK', 'string', '工单编号前缀', 1);

-- 7.3 插入默认管理员账号（密码: Admin@123456，需要应用层BCrypt加密）
-- 注意：这里的密码是明文示例，实际部署时应该通过应用层加密后插入
-- BCrypt hash of "Admin@123456" (示例，实际应用层生成)
INSERT INTO users (username, password, real_name, email, department, status) VALUES
('admin', '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '系统管理员', 'admin@example.com', 'IT部', 1);

-- 7.4 为管理员分配角色
INSERT INTO user_roles (user_id, role_id) VALUES
((SELECT user_id FROM users WHERE username = 'admin'), (SELECT role_id FROM roles WHERE role_code = 'ADMIN'));

-- ========================================
-- 8. 创建视图（可选）
-- ========================================

-- 8.1 工单完整信息视图
CREATE OR REPLACE VIEW v_tickets_full AS
SELECT
  t.ticket_id,
  t.ticket_no,
  t.title,
  t.description,
  t.category,
  t.priority,
  t.status,
  t.progress_percentage,
  t.reject_count,
  t.is_overdue,
  t.requires_second_approval,
  t.expected_finish_time,
  t.actual_finish_time,
  t.created_at,
  t.updated_at,
  c.user_id AS creator_id,
  c.username AS creator_username,
  c.real_name AS creator_name,
  a.user_id AS assignee_id,
  a.username AS assignee_username,
  a.real_name AS assignee_name,
  r.user_id AS reviewer_id,
  r.username AS reviewer_username,
  r.real_name AS reviewer_name,
  ap.user_id AS approver_id,
  ap.username AS approver_username,
  ap.real_name AS approver_name
FROM tickets t
LEFT JOIN users c ON t.creator_id = c.user_id
LEFT JOIN users a ON t.assignee_id = a.user_id
LEFT JOIN users r ON t.reviewer_id = r.user_id
LEFT JOIN users ap ON t.approver_id = ap.user_id
WHERE t.deleted_at IS NULL;

COMMENT ON VIEW v_tickets_full IS '工单完整信息视图';

-- 8.2 用户角色视图
CREATE OR REPLACE VIEW v_user_roles AS
SELECT
  u.user_id,
  u.username,
  u.real_name,
  u.email,
  u.department,
  u.status AS user_status,
  r.role_id,
  r.role_code,
  r.role_name,
  ur.assigned_at
FROM users u
INNER JOIN user_roles ur ON u.user_id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.role_id
WHERE u.deleted_at IS NULL;

COMMENT ON VIEW v_user_roles IS '用户角色视图';

-- ========================================
-- 9. 创建常用函数
-- ========================================

-- 9.1 生成工单编号函数
CREATE OR REPLACE FUNCTION generate_ticket_no()
RETURNS VARCHAR AS $$
DECLARE
  prefix VARCHAR := 'TK';
  date_str VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  next_seq INTEGER;
  ticket_no VARCHAR;
BEGIN
  -- 获取今天的工单数量 + 1
  SELECT COUNT(*) + 1 INTO next_seq
  FROM tickets
  WHERE ticket_no LIKE prefix || date_str || '%';

  -- 生成工单编号
  ticket_no := prefix || date_str || LPAD(next_seq::TEXT, 4, '0');

  RETURN ticket_no;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_ticket_no() IS '生成工单编号函数';

-- 9.2 检查用户是否有指定角色函数
CREATE OR REPLACE FUNCTION user_has_role(p_user_id BIGINT, p_role_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM user_roles ur
  INNER JOIN roles r ON ur.role_id = r.role_id
  WHERE ur.user_id = p_user_id AND r.role_code = p_role_code;

  RETURN role_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION user_has_role(BIGINT, VARCHAR) IS '检查用户是否有指定角色';

-- ========================================
-- 10. 授权（根据实际部署调整）
-- ========================================

-- 创建应用用户（示例）
-- CREATE USER ticket_app WITH PASSWORD 'your_secure_password';

-- 授权给应用用户
-- GRANT USAGE ON SCHEMA public TO ticket_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ticket_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ticket_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ticket_app;

-- ========================================
-- Schema 创建完成
-- ========================================

-- 验证表结构
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 打印完成信息
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PostgreSQL 数据库架构创建成功！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '总计创建:';
  RAISE NOTICE '- 表: 9 张';
  RAISE NOTICE '- 枚举类型: 4 个';
  RAISE NOTICE '- 视图: 2 个';
  RAISE NOTICE '- 函数: 2 个';
  RAISE NOTICE '- 角色: 6 个';
  RAISE NOTICE '- 系统配置: 9 条';
  RAISE NOTICE '========================================';
  RAISE NOTICE '下一步: 修改默认管理员密码并开始应用开发';
  RAISE NOTICE '========================================';
END $$;
