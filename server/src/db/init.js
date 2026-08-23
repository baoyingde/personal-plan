// 数据库初始化：读取 schema.sql 并执行（建库建表）
// 用法: node src/db/init.js

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function init() {
  console.log('开始初始化数据库...')

  // 先连 MySQL 但不指定库（因为要 CREATE DATABASE）
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true, // 允许一次执行多个 SQL 语句
  })

  const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')

  console.log('执行 schema.sql ...')
  await conn.query(schema)

  console.log('✅ 数据库 life_planner 已创建，所有表已建立')
  await conn.end()
}

init().catch(err => {
  console.error('❌ 初始化失败:', err.message)
  process.exit(1)
})
