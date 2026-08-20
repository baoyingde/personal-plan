import { useState, useEffect, useRef, useCallback } from 'react'
import { getMusicFolderHandle, setMusicFolderHandle, clearMusicFolderHandle } from '../store/db'
import { pickFolder, scanFolder, getFileURL, checkPermission, requestPermission, type MusicFile } from '../utils/music'
import ConfirmDialog from '../components/layout/ConfirmDialog'

export default function MusicView() {
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [files, setFiles] = useState<MusicFile[]>([])
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [repeat, setRepeat] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [needReauth, setNeedReauth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileURLRef = useRef<string | null>(null)

  // Init: restore folder handle from IndexedDB
  useEffect(() => {
    (async () => {
      const handle = await getMusicFolderHandle()
      if (handle) {
        const hasPerm = await checkPermission(handle)
        if (hasPerm) {
          await loadFiles(handle)
        } else {
          setFolderHandle(handle)
          setNeedReauth(true)
        }
      }
      setLoading(false)
    })()
  }, [])

  const loadFiles = async (handle: FileSystemDirectoryHandle) => {
    try {
      const musicFiles = await scanFolder(handle)
      setFiles(musicFiles)
      setFolderHandle(handle)
      setNeedReauth(false)
    } catch {
      setNeedReauth(true)
    }
  }

  const handlePickFolder = async () => {
    try {
      const handle = await pickFolder()
      await setMusicFolderHandle(handle)
      await loadFiles(handle)
      setCurrentIdx(-1)
    } catch {
      // user cancelled
    }
  }

  const handleReauth = async () => {
    if (!folderHandle) return
    const granted = await requestPermission(folderHandle)
    if (granted) {
      await loadFiles(folderHandle)
    }
  }

  const handleClear = async () => {
    await clearMusicFolderHandle()
    setFolderHandle(null)
    setFiles([])
    setCurrentIdx(-1)
    stopAudio()
    setShowClearConfirm(false)
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (fileURLRef.current) {
      URL.revokeObjectURL(fileURLRef.current)
      fileURLRef.current = null
    }
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }

  const playFile = useCallback(async (index: number) => {
    if (index < 0 || index >= files.length) return
    stopAudio()
    try {
      const url = await getFileURL(files[index].handle)
      fileURLRef.current = url
      const audio = new Audio(url)
      audio.volume = volume
      audioRef.current = audio
      setCurrentIdx(index)
      setPlaying(true)

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration)
      })
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime)
      })
      audio.addEventListener('ended', () => {
        if (repeat) {
          audio.currentTime = 0
          audio.play()
        } else {
          playNext()
        }
      })
      await audio.play()
    } catch {
      setPlaying(false)
    }
  }, [files, volume, repeat])

  const playNext = useCallback(() => {
    if (files.length === 0) return
    let next: number
    if (shuffle) {
      next = Math.floor(Math.random() * files.length)
    } else {
      next = (currentIdx + 1) % files.length
    }
    playFile(next)
  }, [currentIdx, files, shuffle, playFile])

  const playPrev = () => {
    if (files.length === 0) return
    const prev = currentIdx <= 0 ? files.length - 1 : currentIdx - 1
    playFile(prev)
  }

  const togglePlayPause = () => {
    if (!audioRef.current) {
      if (currentIdx >= 0) playFile(currentIdx)
      else if (files.length > 0) playFile(0)
      return
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (loading) return <div className="loading">加载中…</div>

  if (!folderHandle) {
    return (
      <div className="card">
        <div className="card-body empty" style={{ padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
          <div style={{ fontSize: 16, marginBottom: 20 }}>选择一个本地文件夹来播放音乐</div>
          <button className="btn btn-primary" onClick={handlePickFolder}>选择音乐文件夹</button>
          <div className="text-sm text-secondary" style={{ marginTop: 12 }}>支持 mp3 / flac / m4a / wav / ogg 等格式</div>
        </div>
      </div>
    )
  }

  if (needReauth) {
    return (
      <div className="card">
        <div className="card-body empty" style={{ padding: 60 }}>
          <div style={{ fontSize: 16, marginBottom: 20 }}>需要重新授权才能访问音乐文件夹</div>
          <div className="flex gap-8" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={handleReauth}>重新授权</button>
            <button className="btn" onClick={handlePickFolder}>选择其他文件夹</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height) - 48px)' }}>
      {/* 文件夹信息 + 列表 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div className="card mb-16">
          <div className="card-body flex items-center justify-between" style={{ padding: '10px 20px' }}>
            <span className="text-sm text-secondary">📁 {files.length} 首歌曲</span>
            <div className="flex gap-8">
              <button className="btn btn-sm" onClick={handlePickFolder}>更换文件夹</button>
              <button className="btn btn-sm text-danger" onClick={() => setShowClearConfirm(true)}>取消授权</button>
            </div>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="card"><div className="card-body empty">文件夹内没有找到音频文件</div></div>
        ) : (
          <div className="card">
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 20px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: i === currentIdx ? 'var(--accent-light)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
                onClick={() => playFile(i)}
              >
                <span style={{ width: 24, textAlign: 'center', fontSize: 13 }}>
                  {i === currentIdx && playing ? '🔊' : i === currentIdx ? '⏸' : ''}
                </span>
                <span className={i === currentIdx ? 'fw-600' : ''} style={{ fontSize: 14 }}>
                  {f.name.replace(/\.[^.]+$/, '')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 播放器条 */}
      <div style={{
        marginTop: 16,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '12px 20px',
      }}>
        <div className="flex items-center gap-16">
          <div className="flex items-center gap-8">
            <button className="btn btn-sm" onClick={playPrev}>⏮</button>
            <button className="btn btn-primary btn-sm" style={{ width: 40, height: 40, borderRadius: '50%', fontSize: 18 }} onClick={togglePlayPause}>
              {playing ? '⏸' : '▶'}
            </button>
            <button className="btn btn-sm" onClick={playNext}>⏭</button>
          </div>

          <div style={{ flex: 1 }}>
            <div className="text-sm fw-600" style={{ marginBottom: 4 }}>
              {currentIdx >= 0 ? files[currentIdx]?.name?.replace(/\.[^.]+$/, '') : '未选择歌曲'}
            </div>
            <div className="flex items-center gap-8">
              <span className="text-secondary" style={{ fontSize: 11, width: 35 }}>{formatTime(currentTime)}</span>
              <input type="range" min={0} max={duration || 0} step={0.1} value={currentTime} onChange={handleSeek} style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <span className="text-secondary" style={{ fontSize: 11, width: 35 }}>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <span style={{ fontSize: 13 }}>🔊</span>
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={handleVolume} style={{ width: 80, accentColor: 'var(--accent)' }} />
          </div>

          <button className={`btn btn-sm${repeat ? ' btn-primary' : ''}`} onClick={() => setRepeat(!repeat)} title="单曲循环">🔁</button>
          <button className={`btn btn-sm${shuffle ? ' btn-primary' : ''}`} onClick={() => setShuffle(!shuffle)} title="随机播放">🔀</button>
        </div>
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        title="取消音乐授权"
        message="取消授权后，音乐模块将回到初始状态，需要重新选择文件夹才能使用。确定吗？"
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirm(false)}
        danger
        confirmText="取消授权"
      />
    </div>
  )
}
