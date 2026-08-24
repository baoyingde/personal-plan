-- ============================================================
-- 生活规划 App 第三版数据库结构
-- MySQL 8.0
-- 设计原则：所有业务数据表都带 user_id 外键，实现多用户隔离
-- ============================================================

CREATE DATABASE IF NOT EXISTS life_planner
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE life_planner;

-- ---------- 用户表 ----------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE COMMENT '用户名（登录用）',
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt 密码哈希（绝不存明文）',
  nickname      VARCHAR(50)  DEFAULT NULL COMMENT '昵称',
  role          VARCHAR(10)  NOT NULL DEFAULT 'user' COMMENT 'user / admin',
  status        TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '1=正常 0=禁用',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ---------- 后台操作日志 ----------
CREATE TABLE IF NOT EXISTS admin_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT UNSIGNED NOT NULL COMMENT '操作的管理员 id',
  admin_name  VARCHAR(50)  NOT NULL COMMENT '管理员用户名',
  action      VARCHAR(100) NOT NULL COMMENT '操作类型，如 delete_user / disable_user',
  target_id   INT UNSIGNED DEFAULT NULL COMMENT '操作目标（如被删用户 id）',
  target_name VARCHAR(100) DEFAULT NULL COMMENT '操作目标名称',
  detail      TEXT COMMENT '补充信息',
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_admin (admin_id),
  INDEX idx_logs_time (created_at)
) ENGINE=InnoDB;

-- ---------- 学习计划：学科 ----------
CREATE TABLE IF NOT EXISTS subjects (
  id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id  INT UNSIGNED NOT NULL,
  name     VARCHAR(50)  NOT NULL,
  color    VARCHAR(20)  DEFAULT '#4f46e5',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_subjects_user (user_id)
) ENGINE=InnoDB;

-- ---------- 学习计划：任务 ----------
CREATE TABLE IF NOT EXISTS study_tasks (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  subject_id  INT UNSIGNED DEFAULT NULL,
  title       VARCHAR(200) NOT NULL,
  deadline    DATE DEFAULT NULL,
  notes       TEXT,
  status      VARCHAR(20)  DEFAULT 'todo',   -- todo / done
  subtasks    JSON         DEFAULT NULL,       -- [{text, done}]
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME    DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  INDEX idx_tasks_user (user_id)
) ENGINE=InnoDB;

-- ---------- 锻炼计划 ----------
CREATE TABLE IF NOT EXISTS exercise_entries (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '1-7 周一~周日',
  name       VARCHAR(100) NOT NULL,
  detail     VARCHAR(255) DEFAULT '',
  time_range VARCHAR(50)  DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_exercise_user (user_id)
) ENGINE=InnoDB;

-- 锻炼打卡记录（按日期）
CREATE TABLE IF NOT EXISTS exercise_completions (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  date    DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_exercise_date (user_id, date)
) ENGINE=InnoDB;

-- ---------- 饮食计划 ----------
CREATE TABLE IF NOT EXISTS diet_records (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  date       DATE NOT NULL,
  meal       VARCHAR(20) NOT NULL COMMENT 'breakfast/lunch/dinner/snack',
  name       VARCHAR(100) NOT NULL,
  amount     VARCHAR(50)  DEFAULT '',
  calories   INT UNSIGNED DEFAULT 0,
  protein    DECIMAL(8,1) DEFAULT NULL,
  carbs      DECIMAL(8,1) DEFAULT NULL,
  fat        DECIMAL(8,1) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_diet_user_date (user_id, date)
) ENGINE=InnoDB;

-- 常用食物预设
CREATE TABLE IF NOT EXISTS food_presets (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL,
  name             VARCHAR(100) NOT NULL,
  unit             VARCHAR(50)  DEFAULT '',
  default_calories INT UNSIGNED DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_presets_user (user_id)
) ENGINE=InnoDB;

-- ---------- 娱乐计划 ----------
CREATE TABLE IF NOT EXISTS entertainments (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  title      VARCHAR(200) NOT NULL,
  date       DATE NOT NULL,
  start_time VARCHAR(10)  DEFAULT NULL,
  end_time   VARCHAR(10)  DEFAULT NULL,
  location   VARCHAR(200) DEFAULT NULL,
  type       VARCHAR(20)  DEFAULT 'other',
  notes      TEXT,
  done       TINYINT(1)   DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ent_user_date (user_id, date)
) ENGINE=InnoDB;

-- ---------- 学期课表 ----------
CREATE TABLE IF NOT EXISTS courses (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  name         VARCHAR(100) NOT NULL,
  day_of_week  TINYINT NOT NULL,
  period_index TINYINT NOT NULL,
  location     VARCHAR(200) DEFAULT '',
  week_type    VARCHAR(10)  DEFAULT 'every',   -- every / odd / even
  color        VARCHAR(20)  DEFAULT '#4f46e5',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_courses_user (user_id)
) ENGINE=InnoDB;

-- ---------- 备忘录 ----------
CREATE TABLE IF NOT EXISTS memos (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  text       VARCHAR(500) NOT NULL,
  done       TINYINT(1)   DEFAULT 0,
  pinned     TINYINT(1)   DEFAULT 0,
  due_date   DATE DEFAULT NULL,
  sort_order INT          DEFAULT 0,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_memos_user (user_id)
) ENGINE=InnoDB;

-- ---------- 用户设置 ----------
CREATE TABLE IF NOT EXISTS user_settings (
  user_id          INT UNSIGNED PRIMARY KEY,
  semester_name    VARCHAR(100) DEFAULT '',
  semester_start   DATE DEFAULT NULL,
  periods_json     JSON DEFAULT NULL COMMENT '节次时间表',
  theme            VARCHAR(10)  DEFAULT 'light',
  weekend_enabled  TINYINT(1)   DEFAULT 0,
  home_cards_json  JSON DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
