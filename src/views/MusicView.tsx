import { useState, useRef, useCallback } from 'react'
import { musicApi } from '../api/client'

interface Song {
  id: number
  name: string
  artist: string
  album: string
  duration: number
}

export default function MusicView() {
  const [keyword, setKeyword] = useState('')
  const [songs, setSongs] = useState<Song[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setSearching(true)
    setError('')
    try {
      const result = await musicApi.search(keyword.trim())
      setSongs(result as unknown as Song[])
      setCurrentIdx(-1)
      stopAudio()
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败')
    } finally {
      setSearching(false)
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }

  const playSong = useCallback(async (index: number) => {
    if (index < 0 || index >= songs.length) return
    stopAudio()
    try {
      const result = await musicApi.playUrl(songs[index].id)
      const url = result.url
      // 如果后端返回 fallback（试听链接都失效），打开 QQ 音乐页面
      if ((result as any).fallback) {
        window.open(url, '_blank')
        setError('该歌曲需要在 QQ 音乐中播放（已为你打开页面）')
        return
      }
      const audio = new Audio(url)
      audio.volume = volume
      audioRef.current = audio
      setCurrentIdx(index)
      setPlaying(true)

      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
      audio.addEventListener('error', () => {
        setError('该歌曲无法播放（可能受版权限制），试试其他歌曲')
        setPlaying(false)
      })
      await audio.play()
    } catch {
      setError('播放失败，请重试')
      setPlaying(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, volume])

  const togglePlayPause = () => {
    if (!audioRef.current) {
      if (currentIdx >= 0) playSong(currentIdx)
      else if (songs.length > 0) playSong(0)
      return
    }
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const fmtDur = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return fmtTime(s)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height) - 48px)' }}>
      {/* 搜索栏 */}
      <div className="card mb-16">
        <div className="card-body flex gap-8">
          <input
            className="input"
            placeholder="搜索歌曲…（如：周杰伦、晴天）"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleSearch} disabled={searching}>
            {searching ? '搜索中…' : '🔍 搜索'}
          </button>
        </div>
        {error && <div className="card-body" style={{ paddingTop: 0 }}><div className="text-sm text-danger">{error}</div></div>}
      </div>

      {/* 歌曲列表 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {songs.length === 0 ? (
          <div className="card">
            <div className="card-body empty">
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
              <div>搜索歌曲，直接在网页上播放，无需本地导入音乐</div>
              <div className="text-sm text-secondary" style={{ marginTop: 8 }}>数据来源：在线音乐搜索接口（试听用途）</div>
            </div>
          </div>
        ) : (
          <div className="card">
            {songs.map((s, i) => (
              <div
                key={s.id}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: i === currentIdx ? 'var(--accent-light)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
                onClick={() => playSong(i)}
              >
                <span style={{ width: 20, textAlign: 'center' }}>
                  {i === currentIdx && playing ? '🔊' : i === currentIdx ? '⏸' : ''}
                </span>
                <div style={{ flex: 1 }}>
                  <div className={i === currentIdx ? 'fw-600' : ''}>{s.name}</div>
                  <div className="text-sm text-secondary">{s.artist} · {s.album}</div>
                </div>
                <span className="text-secondary text-sm">{fmtDur(s.duration)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 播放器条 */}
      {currentIdx >= 0 && (
        <div style={{
          marginTop: 16,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '12px 20px',
        }}>
          <div className="flex items-center gap-16">
            <button className="btn btn-primary btn-sm" style={{ width: 40, height: 40, borderRadius: '50%', fontSize: 18 }} onClick={togglePlayPause}>
              {playing ? '⏸' : '▶'}
            </button>
            <div style={{ flex: 1 }}>
              <div className="text-sm fw-600" style={{ marginBottom: 4 }}>
                {songs[currentIdx]?.name} - {songs[currentIdx]?.artist}
              </div>
              <div className="flex items-center gap-8">
                <span className="text-secondary" style={{ fontSize: 11, width: 35 }}>{fmtTime(currentTime)}</span>
                <input type="range" min={0} max={duration || 0} step={0.1} value={currentTime} onChange={handleSeek} style={{ flex: 1, accentColor: 'var(--accent)' }} />
                <span className="text-secondary" style={{ fontSize: 11, width: 35 }}>{fmtTime(duration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <span style={{ fontSize: 13 }}>🔊</span>
              <input type="range" min={0} max={1} step={0.01} value={volume} onChange={handleVolume} style={{ width: 80, accentColor: 'var(--accent)' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
