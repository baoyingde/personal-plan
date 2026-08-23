// 日期格式化工具（后端）
// mysql2 可能把 DATE/DATETIME 列返回成 Date 对象，统一转字符串

function fmtDate(v) {
  if (v == null) return null
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDateTime(v) {
  if (v == null) return null
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${mi}:${s}`
}

module.exports = { fmtDate, fmtDateTime }
