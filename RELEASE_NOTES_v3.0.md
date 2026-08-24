# v3.0 - 生活规划 App 后端版本

生活规划 App（Life Planner）v3.0 发布！本版本从「纯前端本地应用」升级为**前后端完整应用**：新增用户系统与后端服务，所有数据从浏览器本地存储迁移到服务器 MySQL 数据库，支持多设备数据同步。

## ✨ 主要变化

### 🆕 用户系统
- 注册 / 登录（JWT 认证）
- 密码 bcrypt 哈希加密存储，绝不存明文
- 多用户数据隔离：每个账号的数据互不可见

### 🗄️ 数据迁移到服务器数据库
以下数据全部从 IndexedDB（浏览器本地）迁移到 **MySQL 数据库**，登录后任何设备数据一致：

- 学习计划（学科 + 任务 + 子任务）
- 锻炼计划（条目 + 每日打卡）
- 饮食计划（记录 + 常用食物）
- 娱乐计划（活动）
- 学期课表（课程 + 学期设置）
- 备忘录

### 🎵 在线音乐播放
- 新增在线搜索播放（后端代理音乐接口）
- 无需准备本地音乐文件，搜索即播

### 🛠 技术栈
- **前端**：React 18 + TypeScript + Vite + zustand
- **后端**：Node.js + Express + mysql2
- **数据库**：MySQL 8.0（11 张表）
- **认证**：JWT + bcrypt

## 📦 快速开始

```bash
# 1. 初始化数据库（需 MySQL）
cd server
npm install
cp .env.example .env    # 填写 DB_PASSWORD
node src/db/init.js     # 建库建表

# 2. 启动后端（3001 端口）
node src/index.js

# 3. 启动前端（5173 端口，另开终端）
cd ..
npm install
npm run dev
```

访问 `http://localhost:5173` 注册即可使用。

## ✅ 验证

- 前端测试：82 个用例全部通过
- 后端全链路验证：24 项（注册/登录/7 类数据 CRUD/多用户隔离）全部通过

## 📄 许可

MIT License

## ⚠️ 注意

数据库密码等敏感配置在 `server/.env`，已加入 `.gitignore`，不会提交到仓库。clone 后请自行创建 `.env`。
