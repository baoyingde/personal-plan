export function todayStr(): string {
  return formatDate(new Date())
}

export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayStr()
}

export function isPast(dateStr: string): boolean {
  return dateStr < todayStr()
}

export function isFuture(dateStr: string): boolean {
  return dateStr > todayStr()
}

export function getDayOfWeek(dateStr: string): number {
  const d = parseDate(dateStr)
  const day = d.getDay()
  return day === 0 ? 7 : day
}

export function mondayOf(dateStr: string): string {
  const d = parseDate(dateStr)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return formatDate(d)
}

export function semesterWeek(dateStr: string, semesterStartDate: string): number {
  if (!semesterStartDate) return 0
  const d = mondayOf(dateStr)
  const start = mondayOf(semesterStartDate)
  const diffMs = parseDate(d).getTime() - parseDate(start).getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  const week = Math.floor(diffDays / 7) + 1
  return week
}

export function isOddWeek(dateStr: string, semesterStartDate: string): boolean {
  const week = semesterWeek(dateStr, semesterStartDate)
  return week % 2 === 1
}

export function isEvenWeek(dateStr: string, semesterStartDate: string): boolean {
  const week = semesterWeek(dateStr, semesterStartDate)
  return week > 0 && week % 2 === 0
}

export function weekLabel(dateStr: string, semesterStartDate: string): string {
  const week = semesterWeek(dateStr, semesterStartDate)
  if (week <= 0) return '未开学'
  const odd = isOddWeek(dateStr, semesterStartDate)
  return `第 ${week} 周 · ${odd ? '单周' : '双周'}`
}

export function getTodayDayOfWeek(): number {
  return getDayOfWeek(todayStr())
}

export function dateAdd(dateStr: string, days: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

export function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: Date[] = []
  for (let i = first.getDate(); i <= last.getDate(); i++) {
    days.push(new Date(year, month, i))
  }
  return days
}

export function formatChineseDate(dateStr: string): string {
  const d = parseDate(dateStr)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekdays[d.getDay()]}`
}
