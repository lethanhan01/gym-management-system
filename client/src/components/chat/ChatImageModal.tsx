import { Download, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'

export interface ChatImageModalProps {
  open: boolean
  imageUrl: string | null
  altText?: string
  onClose: () => void
}

export function ChatImageModal({ open, imageUrl, altText = 'Chi tiết hình ảnh', onClose }: ChatImageModalProps) {
  const { t } = useTranslation('chat')

  if (!imageUrl) return null

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `gym-chat-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      // Fallback nếu có CORS hạn chế: mở trong tab mới
      window.open(imageUrl, '_blank')
    }
  }

  return (
    <Modal
      open={open}
      title={t('viewImage', 'Xem ảnh')}
      size="xl"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline-white"
            size="sm"
            onClick={handleDownload}
            leftIcon={<Download size={15} />}
          >
            {t('downloadImage', 'Tải ảnh về')}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="text-muted"
              size="sm"
              onClick={() => window.open(imageUrl, '_blank')}
              leftIcon={<ExternalLink size={15} />}
            >
              Mở tab mới
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              {t('cancel', 'Đóng')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-hidden rounded-xl bg-black/60 p-2">
        <img
          src={imageUrl}
          alt={altText}
          className="max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-2xl transition-all"
        />
      </div>
    </Modal>
  )
}
