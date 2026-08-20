import Modal from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  danger?: boolean
}

export default function ConfirmDialog({
  open, title, message, onConfirm, onCancel, confirmText = '确认', danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel}>取消</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14, lineHeight: 1.6 }}>{message}</p>
    </Modal>
  )
}
