const AUDIO_EXTENSIONS = /\.(mp3|flac|m4a|wav|ogg|aac|wma)$/i

export interface MusicFile {
  name: string
  handle: FileSystemFileHandle
}

export async function pickFolder(): Promise<FileSystemDirectoryHandle> {
  return await window.showDirectoryPicker({ mode: 'read' })
}

export async function scanFolder(dirHandle: FileSystemDirectoryHandle): Promise<MusicFile[]> {
  const files: MusicFile[] = []
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file' && AUDIO_EXTENSIONS.test(name)) {
      files.push({ name, handle: handle as FileSystemFileHandle })
    }
  }
  files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return files
}

export async function getFileURL(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile()
  return URL.createObjectURL(file)
}

export async function checkPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const result = await handle.queryPermission({ mode: 'read' })
  return result === 'granted'
}

export async function requestPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const result = await handle.requestPermission({ mode: 'read' })
  return result === 'granted'
}

export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url)
}
