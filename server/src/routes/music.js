// 在线音乐路由（网易云音乐）
// 搜索：网易云搜索 API
// 播放：网易云外链播放地址（无需登录即可试听）

const express = require('express')
const router = express.Router()

const NETEASE_SEARCH = 'https://music.163.com/api/cloudsearch/pc'
const NETEASE_PLAY = 'https://music.163.com/song/media/outer/url'

// GET /api/music/search?keyword=xxx&limit=20
router.get('/search', async (req, res) => {
  const keyword = (req.query.keyword || '').trim()
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)))
  if (!keyword) return res.status(400).json({ error: '缺少搜索关键词' })

  try {
    const params = new URLSearchParams({ s: keyword, type: '1', limit: String(limit), offset: '0' })
    const resp = await fetch(`${NETEASE_SEARCH}?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/',
      },
    })
    const data = await resp.json()

    const songs = (data.result?.songs || []).map(s => ({
      id: s.id,
      name: s.name || '',
      artist: (s.ar || []).map(a => a.name).join(' / '),
      album: s.al?.name || '',
      duration: s.dt || 0,
    }))
    res.json(songs)
  } catch (err) {
    console.error('音乐搜索失败:', err.message)
    res.status(502).json({ error: '音乐服务暂不可用，请稍后再试' })
  }
})

// GET /api/music/play?id=xxx
router.get('/play', (req, res) => {
  const id = req.query.id
  if (!id) return res.status(400).json({ error: '缺少歌曲 id' })

  // 网易云公开外链播放地址
  const url = `${NETEASE_PLAY}?id=${id}.mp3`
  res.json({ url, id })
})

module.exports = router
