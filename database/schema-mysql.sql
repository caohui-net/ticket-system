-- ========================================
-- 工单管理系统 - MySQL 数据库架构
-- ========================================
-- 版本: v1.0
-- 数据库: MySQL 8.0+
-- 字符集: UTF8MB4
-- 排序规则: utf8mb4_unicode_ci
-- 创建日期: 2026-09-06
-- ========================================

-- 1. 创建数据库（如果需要）
-- CREATE DATABASE IF NOT EXISTS ticket_system
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_unicode_ci;

-- USE ticket_system;

-- 设置会话参数
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ========================================
-- 2. 创建表
-- ========================================

-- 2.1 角色表
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `role_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '角色ID（主键）',
  `role_code` VARCHAR(50) NOT NULL COMMENT '角色代码（唯一）',
  `role_name` VARCHAR(50) NOT NULL COMMENT '角色名称',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '角色描述',
  `permissions` TEXT DEFAULT NULL COMMENT '权限列表（JSON格式）',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统内置角色（1=是，0=否）',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态（1=启用，0=禁用）',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uk_role_code` (`role_code`),
  KEY `idx_role_code` (`role_code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 2.2 用户表
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID（主键）',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名（唯一）',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（BCrypt加密）',
  `real_name` VARCHAR(50) NOT NULL COMMENT '真实姓名',
  `email` VARCHAR(100) NOT NULL COMMENT '邮箱（唯一）',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `department` VARCHAR(50) DEFAULT NULL COMMENT '部门',
  `avatar_url` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '账号状态（1=启用，0=禁用）',
  `last_login_at` TIMESTAMP NULL DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(45) DEFAULT NULL COMMENT '最后登录IP',
  `failed_login_attempts` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '失败登录次数',
  `locked_until` TIMESTAMP NULL DEFAULT NULL COMMENT '账号锁定截止时间',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_department` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2.3 用户角色关联表
DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE `user_roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID（外键）',
  `role_id` INT UNSIGNED NOT NULL COMMENT '角色ID（外键）',
  `assigned_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '分配人ID',
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role_id` (`role_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_assigner` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 2.4 工单表
DROP TABLE IF EXISTS `tickets`;
CREATE TABLE `tickets` (
  `ticket_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '工单ID（主键）',
  `ticket_no` VARCHAR(50) NOT NULL COMMENT '工单编号（唯一）',
  `title` VARCHAR(200) NOT NULL COMMENT '工单标题',
  `description` TEXT NOT NULL COMMENT '问题描述',
  `category` VARCHAR(50) NOT NULL COMMENT '工单类别',
  `priority` ENUM('urgent', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium' COMMENT '优先级',
  `status` ENUM('draft', 'pending_assign', 'processing', 'pending_review', 'rejected', 'completed', 'closed', 'cancelled') NOT NULL DEFAULT 'pending_assign' COMMENT '工单状态',
  `creator_id` BIGINT UNSIGNED NOT NULL COMMENT '创建人ID',
  `assignee_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '当前处理人ID',
  `reviewer_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '当前审核人ID',
  `approver_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '二级审批人ID',
  `expected_finish_time` TIMESTAMP NULL DEFAULT NULL COMMENT '期望完成时间',
  `actual_finish_time` TIMESTAMP NULL DEFAULT NULL COMMENT '实际完成时间',
  `processing_started_at` TIMESTAMP NULL DEFAULT NULL COMMENT '开始处理时间',
  `submitted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '提交审核时间',
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL COMMENT '审核完成时间',
  `closed_at` TIMESTAMP NULL DEFAULT NULL COMMENT '关闭时间',
  `processing_result` TEXT DEFAULT NULL COMMENT '处理结果说明',
  `review_comment` TEXT DEFAULT NULL COMMENT '审核意见',
  `reject_reason` TEXT DEFAULT NULL COMMENT '驳回原因',
  `reject_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '驳回次数',
  `progress_percentage` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '处理进度（0-100）',
  `actual_work_hours` DECIMAL(10, 2) DEFAULT NULL COMMENT '实际工时（小时）',
  `is_overdue` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否超期',
  `is_urgent_notified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已发送紧急通知',
  `requires_second_approval` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否需要二级审批',
  `tags` VARCHAR(500) DEFAULT NULL COMMENT '标签（JSON数组）',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (`ticket_id`),
  UNIQUE KEY `uk_ticket_no` (`ticket_no`),
  KEY `idx_ticket_no` (`ticket_no`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_creator_id` (`creator_id`),
  KEY `idx_assignee_id` (`assignee_id`),
  KEY `idx_reviewer_id` (`reviewer_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_status_priority` (`status`, `priority`),
  KEY `idx_assignee_status` (`assignee_id`, `status`),
  KEY `idx_category` (`category`),
  KEY `idx_expected_time` (`expected_finish_time`),
  CONSTRAINT `fk_tickets_creator` FOREIGN KEY (`creator_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_tickets_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tickets_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tickets_approver` FOREIGN KEY (`approver_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_progress` CHECK (`progress_percentage` >= 0 AND `progress_percentage` <= 100),
  CONSTRAINT `chk_reject_count` CHECK (`reject_count` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单表';

-- 2.5 工单操作日志表
DROP TABLE IF EXISTS `ticket_logs`;
CREATE TABLE `ticket_logs` (
  `log_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID（主键）',
  `ticket_id` BIGINT UNSIGNED NOT NULL COMMENT '工单ID（外键）',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '操作人ID（外键）',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `old_status` VARCHAR(20) DEFAULT NULL COMMENT '变更前状态',
  `new_status` VARCHAR(20) DEFAULT NULL COMMENT '变更后状态',
  `content` TEXT DEFAULT NULL COMMENT '操作内容/备注',
  `extra_data` JSON DEFAULT NULL COMMENT '额外数据（JSON格式）',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT '操作IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理信息',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  PRIMARY KEY (`log_id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_ticket_created` (`ticket_id`, `created_at`),
  CONSTRAINT `fk_logs_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`ticket_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单操作日志表';

-- 2.6 工单附件表
DROP TABLE IF EXISTS `ticket_attachments`;
CREATE TABLE `ticket_attachments` (
  `attachment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '附件ID（主键）',
  `ticket_id` BIGINT UNSIGNED NOT NULL COMMENT '工单ID（外键）',
  `file_name` VARCHAR(255) NOT NULL COMMENT '文件名',
  `file_original_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `file_path` VARCHAR(500) NOT NULL COMMENT '文件存储路径',
  `file_size` BIGINT UNSIGNED NOT NULL COMMENT '文件大小（字节）',
  `file_type` VARCHAR(100) NOT NULL COMMENT '文件MIME类型',
  `file_extension` VARCHAR(20) NOT NULL COMMENT '文件扩展名',
  `upload_type` ENUM('problem', 'solution') NOT NULL DEFAULT 'problem' COMMENT '上传类型',
  `uploader_id` BIGINT UNSIGNED NOT NULL COMMENT '上传人ID（外键）',
  `upload_stage` VARCHAR(50) NOT NULL COMMENT '上传阶段',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已删除',
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  `deleted_at` TIMESTAMP NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`attachment_id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_uploader_id` (`uploader_id`),
  KEY `idx_uploaded_at` (`uploaded_at`),
  KEY `idx_is_deleted` (`is_deleted`),
  CONSTRAINT `fk_attachments_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`ticket_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attachments_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `chk_file_size` CHECK (`file_size` > 0 AND `file_size` <= 10485760)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单附件表';

-- 2.7 工单分配记录表
DROP TABLE IF EXISTS `ticket_assignments`;
CREATE TABLE `ticket_assignments` (
  `assignment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分配记录ID（主键）',
  `ticket_id` BIGINT UNSIGNED NOT NULL COMMENT '工单ID（外键）',
  `assignee_id` BIGINT UNSIGNED NOT NULL COMMENT '被分配人ID（外键）',
  `assigner_id` BIGINT UNSIGNED NOT NULL COMMENT '分配人ID（外键）',
  `assignment_type` ENUM('assign', 'reassign') NOT NULL DEFAULT 'assign' COMMENT '分配类型',
  `assignment_reason` VARCHAR(500) DEFAULT NULL COMMENT '分配说明/重新分配原因',
  `is_current` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否当前有效',
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
  `unassigned_at` TIMESTAMP NULL DEFAULT NULL COMMENT '取消分配时间',
  PRIMARY KEY (`assignment_id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_assignee_id` (`assignee_id`),
  KEY `idx_is_current` (`is_current`),
  KEY `idx_assigned_at` (`assigned_at`),
  KEY `idx_ticket_current` (`ticket_id`, `is_current`),
  CONSTRAINT `fk_assignments_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`ticket_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignments_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_assignments_assigner` FOREIGN KEY (`assigner_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单分配记录表';

-- 2.8 通知表
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `notification_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '通知ID（主键）',
  `recipient_id` BIGINT UNSIGNED NOT NULL COMMENT '接收人ID（外键）',
  `sender_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '发送人ID（外键，NULL表示系统）',
  `ticket_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联工单ID（外键）',
  `type` VARCHAR(50) NOT NULL COMMENT '通知类型',
  `title` VARCHAR(200) NOT NULL COMMENT '通知标题',
  `content` TEXT NOT NULL COMMENT '通知内容',
  `link_url` VARCHAR(500) DEFAULT NULL COMMENT '跳转链接',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已读',
  `read_at` TIMESTAMP NULL DEFAULT NULL COMMENT '阅读时间',
  `notification_method` SET('system', 'email', 'sms') NOT NULL DEFAULT 'system' COMMENT '通知方式',
  `email_sent` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '邮件是否已发送',
  `email_sent_at` TIMESTAMP NULL DEFAULT NULL COMMENT '邮件发送时间',
  `sms_sent` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '短信是否已发送',
  `sms_sent_at` TIMESTAMP NULL DEFAULT NULL COMMENT '短信发送时间',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `expired_at` TIMESTAMP NULL DEFAULT NULL COMMENT '过期时间',
  PRIMARY KEY (`notification_id`),
  KEY `idx_recipient_id` (`recipient_id`),
  KEY `idx_ticket_id` (`ticket_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_type` (`type`),
  KEY `idx_recipient_read` (`recipient_id`, `is_read`),
  CONSTRAINT `fk_notifications_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notifications_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`ticket_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 2.9 系统配置表
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `setting_id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '配置ID（主键）',
  `setting_key` VARCHAR(100) NOT NULL COMMENT '配置键（唯一）',
  `setting_value` TEXT DEFAULT NULL COMMENT '配置值',
  `setting_type` VARCHAR(20) NOT NULL DEFAULT 'string' COMMENT '值类型',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '配置说明',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统配置',
  `updated_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '最后更新人ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `uk_setting_key` (`setting_key`),
  KEY `idx_setting_key` (`setting_key`),
  CONSTRAINT `fk_settings_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ========================================
-- 3. 创建视图
-- ========================================

-- 3.1 工单完整信息视图
CREATE OR REPLACE VIEW `v_tickets_full` AS
SELECT
  t.`ticket_id`,
  t.`ticket_no`,
  t.`title`,
  t.`description`,
  t.`category`,
  t.`priority`,
  t.`status`,
  t.`progress_percentage`,
  t.`reject_count`,
  t.`is_overdue`,
  t.`requires_second_approval`,
  t.`expected_finish_time`,
  t.`actual_finish_time`,
  t.`created_at`,
  t.`updated_at`,
  c.`user_id` AS `creator_id`,
  c.`username` AS `creator_username`,
  c.`real_name` AS `creator_name`,
  a.`user_id` AS `assignee_id`,
  a.`username` AS `assignee_username`,
  a.`real_name` AS `assignee_name`,
  r.`user_id` AS `reviewer_id`,
  r.`username` AS `reviewer_username`,
  r.`real_name` AS `reviewer_name`,
  ap.`user_id` AS `approver_id`,
  ap.`username` AS `approver_username`,
  ap.`real_name` AS `approver_name`
FROM `tickets` t
LEFT JOIN `users` c ON t.`creator_id` = c.`user_id`
LEFT JOIN `users` a ON t.`assignee_id` = a.`user_id`
LEFT JOIN `users` r ON t.`reviewer_id` = r.`user_id`
LEFT JOIN `users` ap ON t.`approver_id` = ap.`user_id`
WHERE t.`deleted_at` IS NULL;

-- 3.2 用户角色视图
CREATE OR REPLACE VIEW `v_user_roles` AS
SELECT
  u.`user_id`,
  u.`username`,
  u.`real_name`,
  u.`email`,
  u.`department`,
  u.`status` AS `user_status`,
  r.`role_id`,
  r.`role_code`,
  r.`role_name`,
  ur.`assigned_at`
FROM `users` u
INNER JOIN `user_roles` ur ON u.`user_id` = ur.`user_id`
INNER JOIN `roles` r ON ur.`role_id` = r.`role_id`
WHERE u.`deleted_at` IS NULL;

-- ========================================
-- 4. 创建存储过程和函数
-- ========================================

-- 4.1 生成工单编号函数
DELIMITER $$

DROP FUNCTION IF EXISTS `generate_ticket_no`$$
CREATE FUNCTION `generate_ticket_no`()
RETURNS VARCHAR(50)
DETERMINISTIC
BEGIN
  DECLARE prefix VARCHAR(10) DEFAULT 'TK';
  DECLARE date_str VARCHAR(8);
  DECLARE next_seq INT;
  DECLARE ticket_no VARCHAR(50);

  -- 获取日期字符串
  SET date_str = DATE_FORMAT(CURDATE(), '%Y%m%d');

  -- 获取今天的工单数量 + 1
  SELECT COUNT(*) + 1 INTO next_seq
  FROM `tickets`
  WHERE `ticket_no` LIKE CONCAT(prefix, date_str, '%');

  -- 生成工单编号
  SET ticket_no = CONCAT(prefix, date_str, LPAD(next_seq, 4, '0'));

  RETURN ticket_no;
END$$

DELIMITER ;

-- 4.2 检查用户是否有指定角色函数
DELIMITER $$

DROP FUNCTION IF EXISTS `user_has_role`$$
CREATE FUNCTION `user_has_role`(p_user_id BIGINT, p_role_code VARCHAR(50))
RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE role_count INT;

  SELECT COUNT(*) INTO role_count
  FROM `user_roles` ur
  INNER JOIN `roles` r ON ur.`role_id` = r.`role_id`
  WHERE ur.`user_id` = p_user_id AND r.`role_code` = p_role_code;

  RETURN role_count > 0;
END$$

DELIMITER ;

-- 4.3 获取用户未读通知数量函数
DELIMITER $$

DROP FUNCTION IF EXISTS `get_unread_notification_count`$$
CREATE FUNCTION `get_unread_notification_count`(p_user_id BIGINT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE unread_count INT;

  SELECT COUNT(*) INTO unread_count
  FROM `notifications`
  WHERE `recipient_id` = p_user_id AND `is_read` = 0;

  RETURN unread_count;
END$$

DELIMITER ;

-- ========================================
-- 5. 插入初始数据
-- ========================================

-- 5.1 插入角色数据
INSERT INTO `roles` (`role_code`, `role_name`, `description`, `is_system`, `status`) VALUES
('CREATOR', '工单创建者', '可以创建和查看自己的工单', 1, 1),
('HANDLER', '处理人员', '可以处理分配给自己的工单', 1, 1),
('REVIEWER', '部门主管', '可以审核工单处理结果', 1, 1),
('APPROVER', '分管领导', '可以进行二级审批', 1, 1),
('ADMIN', '系统管理员', '可以管理所有工单和用户', 1, 1),
('REPORTER', '报表查看者', '只读查看统计报表', 1, 1);

-- 5.2 插入系统配置数据
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `setting_type`, `description`, `is_system`) VALUES
('assign_timeout_hours', '24', 'int', '待分配工单超时时间（小时）', 1),
('process_timeout_hours', '48', 'int', '处理中工单超时时间（小时）', 1),
('review_timeout_hours', '72', 'int', '待审核工单超时时间（小时）', 1),
('max_attachment_size_mb', '10', 'int', '单个附件最大大小（MB）', 1),
('max_attachments_count', '20', 'int', '单个工单最大附件数量', 1),
('enable_email_notification', 'true', 'bool', '是否启用邮件通知', 1),
('enable_sms_notification', 'false', 'bool', '是否启用短信通知', 1),
('auto_assign_enabled', 'false', 'bool', '是否启用自动分配', 1),
('ticket_no_prefix', 'TK', 'string', '工单编号前缀', 1);

-- 5.3 插入默认管理员账号
-- 注意：密码是 "Admin@123456" 的 BCrypt 加密（示例，实际应用层生成）
-- BCrypt 在线生成: https://bcrypt-generator.com/
-- 下面的哈希值仅作示例，实际部署时应该通过应用层生成
INSERT INTO `users` (`username`, `password`, `real_name`, `email`, `department`, `status`) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.L6MZkXOlRfjkC.5JmxWqZq7vXZqLDC', '系统管理员', 'admin@example.com', 'IT部', 1);

-- 5.4 为管理员分配角色
INSERT INTO `user_roles` (`user_id`, `role_id`)
SELECT u.`user_id`, r.`role_id`
FROM `users` u, `roles` r
WHERE u.`username` = 'admin' AND r.`role_code` = 'ADMIN';

-- ========================================
-- 6. 创建触发器（可选）
-- ========================================

-- 6.1 工单创建后自动记录日志
DELIMITER $$

DROP TRIGGER IF EXISTS `trg_ticket_after_insert`$$
CREATE TRIGGER `trg_ticket_after_insert`
AFTER INSERT ON `tickets`
FOR EACH ROW
BEGIN
  INSERT INTO `ticket_logs` (`ticket_id`, `user_id`, `action`, `new_status`, `content`)
  VALUES (NEW.`ticket_id`, NEW.`creator_id`, 'create', NEW.`status`, CONCAT('创建工单: ', NEW.`title`));
END$$

DELIMITER ;

-- 6.2 工单状态变更后自动记录日志
DELIMITER $$

DROP TRIGGER IF EXISTS `trg_ticket_after_update`$$
CREATE TRIGGER `trg_ticket_after_update`
AFTER UPDATE ON `tickets`
FOR EACH ROW
BEGIN
  IF OLD.`status` != NEW.`status` THEN
    INSERT INTO `ticket_logs` (`ticket_id`, `user_id`, `action`, `old_status`, `new_status`, `content`)
    VALUES (
      NEW.`ticket_id`,
      COALESCE(NEW.`assignee_id`, NEW.`reviewer_id`, NEW.`creator_id`),
      'status_change',
      OLD.`status`,
      NEW.`status`,
      CONCAT('状态变更: ', OLD.`status`, ' -> ', NEW.`status`)
    );
  END IF;
END$$

DELIMITER ;

-- ========================================
-- 7. 恢复外键检查
-- ========================================

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- 8. 验证表结构
-- ========================================

SELECT
  TABLE_NAME,
  TABLE_COMMENT,
  TABLE_ROWS,
  CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- ========================================
-- 9. 打印完成信息
-- ========================================

SELECT '========================================'AS '';
SELECT 'MySQL 数据库架构创建成功！' AS '';
SELECT '========================================'AS '';
SELECT '总计创建:' AS '';
SELECT '- 表: 9 张' AS '';
SELECT '- 视图: 2 个' AS '';
SELECT '- 函数: 3 个' AS '';
SELECT '- 触发器: 2 个' AS '';
SELECT '- 角色: 6 个' AS '';
SELECT '- 系统配置: 9 条' AS '';
SELECT '========================================'AS '';
SELECT '默认管理员账号:' AS '';
SELECT '  用户名: admin' AS '';
SELECT '  密码: Admin@123456' AS '';
SELECT '========================================'AS '';
SELECT '下一步: 修改默认管理员密码并开始应用开发' AS '';
SELECT '========================================'AS '';

-- ========================================
-- Schema 创建完成
-- ========================================
