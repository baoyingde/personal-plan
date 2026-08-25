// 在线音乐路由（QQ 音乐源）
// 搜索：QQ 音乐公开搜索接口（国内服务器直连，响应快）
// 播放：QQ 音乐公开试听链接（无需登录，m4a 格式）

const express = require('express')
const router = express.Router()

const QQ_SEARCH_URL = 'https://c.y.qq.com/soso/fcgi-bin/client_search_cp'
const QQ_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://y.qq.com/',
}

// GET /api/music/search?keyword=xxx&limit=20
router.get('/search', async (req, res) => {
  const keyword = (req.query.keyword || '').trim()
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)))
  if (!keyword) return res.status(400).json({ error: '缺少搜索关键词' })

  try {
    const params = new URLSearchParams({ p: '1', n: String(limit), w: keyword, format: 'json' })
    const resp = await fetch(`${QQ_SEARCH_URL}?${params}`, { headers: QQ_HEADERS })
    const text = await resp.text()

    // QQ 音乐返回的 JSON 有时带回调包装，先尝试直接解析
    let data
    try { data = JSON.parse(text) } catch {
      const m = text.match(/\{[\s\S]*\}/)
      if (m) data = JSON.parse(m[0])
      else return res.status(502).json({ error: 'QQ 音乐返回格式异常' })
    }

    const songs = (data.data?.song?.list || []).map(s => ({
      id: s.songmid || s.songid,
      name: s.songname || '',
      artist: (s.singer || []).map(a => a.name).join(' / '),
      album: s.albumname || '',
      duration: (s.interval || 0) * 1000, // 秒 → 毫秒
      mid: s.songmid,
    }))
    res.json(songs)
  } catch (err) {
    console.error('QQ 音乐搜索失败:', err.message)
    res.status(502).json({ error: '音乐服务暂不可用，请稍后再试' })
  }
})

// GET /api/music/play?id=xxx（id 即 songmid）
router.get('/play', async (req, res) => {
  const mid = req.query.id
  if (!mid) return res.status(400).json({ error: '缺少歌曲 id' })

  // QQ 音乐公开试听链接（m4a 格式，无需登录）
  const tryUrls = [
    `https://dl.stream.qqmusic.qq.com/C400${mid}.m4a?guid=&uin=&fromtag=66`,
    `https://ws.stream.qqmusic.qq.com/C400${mid}.m4a?fromtag=38`,
  ]

  for (const url of tryUrls) {
    try {
      const test = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      const ct = test.headers.get('content-type') || ''
      const cl = Number(test.headers.get('content-length') || 0)
      if (test.ok && ct.includes('audio') && cl > 10000) {
        return res.json({ url, id: mid })
      }
    } catch { /* try next */ }
  }

  // 公开链接都失败，返回 QQ 音乐外链页面
  res.json({ url: `https://y.qq.com/n/ryqq/songDetail/${mid}`, id: mid, fallback: true })
})

module.exports = router
