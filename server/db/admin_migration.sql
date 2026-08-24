-- ============================================================
-- 后台管理程序数据库迁移脚本
-- 1. users 表加 role 字段（user / admin）
-- 2. 新建 admin_logs 操作日志表
-- 3. 把 tzjsb 提升为管理员
-- ============================================================

USE life_planner;

-- 1. users 表加 role 字段
ALTER TABLE users
  ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'user' COMMENT 'user / admin' AFTER nickname,
  ADD COLUMN status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=正常 0=禁用' AFTER role;

-- 索引：按角色查询
ALTER TABLE users ADD INDEX idx_users_role (role);

-- 2. 新建 admin_logs 操作日志表
CREATE TABLE IF NOT EXISTS admin_logs (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id   INT UNSIGNED NOT NULL COMMENT '操作的管理员 id',
  admin_name VARCHAR(50)  NOT NULL COMMENT '管理员用户名',
  action     VARCHAR(100) NOT NULL COMMENT '操作类型，如 delete_user / disable_user',
  target_id  INT UNSIGNED DEFAULT NULL COMMENT '操作目标（如被删用户 id）',
  target_name VARCHAR(100) DEFAULT NULL COMMENT '操作目标名称',
  detail     TEXT COMMENT '补充信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_admin (admin_id),
  INDEX idx_logs_time (created_at)
) ENGINE=InnoDB;

-- 3. 把 tzjsb 提升为管理员
UPDATE users SET role = 'admin' WHERE username = 'tzjsb';

-- 验证
SELECT id, username, role, status FROM users WHERE role = 'admin';
