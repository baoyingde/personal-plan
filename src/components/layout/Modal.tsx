import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}

export default function Modal({ open, title, onClose, children, footer, width }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="modal-overlay">
      <div
        className="modal"
        style={width ? { width } : undefined}
        onClick={e => e.stopPropagation()}
        ref={ref}
      >
        <div className="modal-header">
          <span>{title}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="关闭">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
