// 在线音乐路由（免本地导入）
// 实现：代理网易云音乐的公开接口
//   - 搜索: 网易云搜索 API
//   - 播放: 网易云外链播放地址（无需登录即可试听）
// 说明：这是学习用途的公开接口对接示例；正式商用请使用授权音乐服务

const express = require('express')
const router = express.Router()

const MUSIC_SEARCH_API = 'https://music.163.com/api/cloudsearch/pc'
const MUSIC_PLAY_URL = 'https://music.163.com/song/media/outer/url'

// GET /api/music/search?keyword=周杰伦&limit=20
// 返回: [{ id, name, artist, album, duration }]
router.get('/search', async (req, res) => {
  const keyword = (req.query.keyword || '').trim()
  const limit = Number(req.query.limit || 20)
  if (!keyword) return res.status(400).json({ error: '缺少搜索关键词' })

  try {
    const params = new URLSearchParams({ s: keyword, type: 1, limit: String(limit), offset: '0' })
    const resp = await fetch(`${MUSIC_SEARCH_API}?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', Referer: 'https://music.163.com/' },
    })
    const data = await resp.json()

    const songs = (data.result?.songs || []).map(s => ({
      id: s.id,
      name: s.name,
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
// 返回: { url: 播放地址 }
router.get('/play', async (req, res) => {
  const id = req.query.id
  if (!id) return res.status(400).json({ error: '缺少歌曲 id' })

  // 网易云公开外链播放地址（试听用途）
  const url = `${MUSIC_PLAY_URL}?id=${id}.mp3`
  res.json({ url, id })
})

module.exports = router
