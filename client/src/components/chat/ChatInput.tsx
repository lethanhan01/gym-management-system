import { lazy, Suspense, useState, useRef, useEffect, useCallback, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Image, Smile, Send, X, Loader2 } from 'lucide-react'
import { Theme, type EmojiClickData } from 'emoji-picker-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover'
import { Tooltip } from '@/components/ui/Tooltip'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const LazyEmojiPicker = lazy(() => import('emoji-picker-react'))

export interface ChatInputProps {
  conversationId?: string
  disabled?: boolean
  isUploading?: boolean
  placeholder?: string
  className?: string
  onSendMessage: (content: string) => Promise<void>
  onSendImage: (file: File) => Promise<void>
  onTyping?: (isTyping: boolean) => void
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function ChatInput({
  conversationId: _conversationId,
  disabled = false,
  isUploading = false,
  placeholder,
  className,
  onSendMessage,
  onSendImage,
  onTyping,
}: ChatInputProps) {
  const { t } = useTranslation('chat')
  const [text, setText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isEmojiOpen, setIsEmojiOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tự động điều chỉnh chiều cao textarea theo nội dung
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    if (!text) {
      el.style.height = '40px'
      return
    }
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, 120)
    el.style.height = `${Math.max(newHeight, 40)}px`
  }, [text])

  useEffect(() => {
    adjustTextareaHeight()
  }, [text, adjustTextareaHeight])

  // Dọn dẹp URL preview khi unmount hoặc đổi ảnh
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // Bắt sự kiện typing và debounce
  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)

    if (onTyping) {
      onTyping(true)
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
      typingTimerRef.current = setTimeout(() => {
        onTyping(false)
        typingTimerRef.current = null
      }, 1500)
    }
  }

  // Chọn Emoji từ EmojiPicker
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const el = textareaRef.current
    if (!el) {
      setText((prev) => prev + emojiData.emoji)
      return
    }

    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const newText = text.substring(0, start) + emojiData.emoji + text.substring(end)
    setText(newText)

    // Khôi phục con trỏ chuột ngay sau emoji
    setTimeout(() => {
      el.focus()
      const nextPos = start + emojiData.emoji.length
      el.setSelectionRange(nextPos, nextPos)
    }, 0)

    setIsEmojiOpen(false)
  }

  // Chọn ảnh từ máy tính
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(t('invalidImageTypeError', 'Chỉ hỗ trợ file ảnh định dạng JPG, PNG, hoặc WebP.'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(t('maxImageSizeError', 'Kích thước ảnh tối đa cho phép là 5MB.'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  // Xóa ảnh xem trước
  const handleRemoveSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Gửi tin nhắn (Text hoặc Image)
  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (disabled || isSending || isUploading) return

    const trimmedText = text.trim()
    const hasImage = Boolean(selectedFile)

    if (!trimmedText && !hasImage) return

    setIsSending(true)

    // Dừng typing indicator ngay lập tức
    if (onTyping) {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
      onTyping(false)
    }

    try {
      // Nếu có ảnh -> gửi ảnh trước
      if (selectedFile) {
        const fileToUpload = selectedFile
        handleRemoveSelectedFile()
        await onSendImage(fileToUpload)
      }

      // Nếu có nội dung text -> gửi tin nhắn text
      if (trimmedText) {
        setText('')
        if (textareaRef.current) {
          textareaRef.current.style.height = '40px'
        }
        await onSendMessage(trimmedText)
      }
    } catch {
      // Lỗi đã được xử lý hoặc toast ở store/service
    } finally {
      setIsSending(false)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
    }
  }

  // Bắt phím Enter để gửi (Shift+Enter để xuống dòng)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = (text.trim().length > 0 || Boolean(selectedFile)) && !disabled && !isSending && !isUploading

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 sm:p-2 transition-all shadow-sm focus-within:border-[var(--rogym-teal)]/40 focus-within:bg-white/[0.06]',
        disabled ? 'opacity-60 pointer-events-none' : '',
        className
      )}
    >
      {/* Khung xem trước ảnh thumbnail nếu có ảnh được chọn */}
      {previewUrl && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-black/40 p-2 border border-white/10 w-fit">
          <div className="relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-lg border border-white/20">
            <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={handleRemoveSelectedFile}
              className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-white hover:bg-red-600 transition-colors"
              aria-label={t('deletePhoto', 'Xóa ảnh')}
            >
              <X size={12} />
            </button>
          </div>
          <div className="flex flex-col text-xs pr-2">
            <span className="font-medium text-white max-w-[130px] sm:max-w-[160px] truncate">{selectedFile?.name}</span>
            <span className="text-[var(--rogym-text-secondary)]">
              {((selectedFile?.size || 0) / 1024).toFixed(0)} KB
            </span>
          </div>
        </div>
      )}

      <div className="flex items-end gap-1 sm:gap-1.5">
        {/* Nút đính kèm ảnh */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || isSending || isUploading}
        />
        <Tooltip content={t('uploadImage', 'Đính kèm hình ảnh')}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending || isUploading}
            aria-label={t('uploadImage', 'Đính kèm hình ảnh')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--rogym-text-secondary)] hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Image size={20} />
          </button>
        </Tooltip>

        {/* Nút chọn Emoji */}
        <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
          <Tooltip content={t('emojiPicker', 'Biểu tượng cảm xúc')}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled || isSending || isUploading}
                aria-label={t('emojiPicker', 'Biểu tượng cảm xúc')}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 shrink-0 disabled:opacity-40 disabled:pointer-events-none',
                  isEmojiOpen
                    ? 'text-[var(--rogym-teal)] bg-white/10'
                    : 'text-[var(--rogym-text-secondary)] hover:text-white hover:bg-white/10'
                )}
              >
                <Smile size={20} />
              </button>
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent
            side="top"
            align="start"
            sideOffset={10}
            className="p-0 border-0 bg-transparent shadow-2xl z-[100] max-w-[calc(100vw-32px)]"
          >
            {isEmojiOpen && (
              <Suspense
                fallback={
                  <div className="flex h-[320px] w-[280px] sm:w-[320px] items-center justify-center rounded-2xl bg-[var(--rogym-bg-card)] border border-white/10 text-white shadow-2xl">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--rogym-teal)]" />
                  </div>
                }
              >
                <LazyEmojiPicker
                  theme={Theme.DARK}
                  onEmojiClick={handleEmojiClick}
                  lazyLoadEmojis
                  previewConfig={{ showPreview: false }}
                  height={340}
                  width="100%"
                  style={{ maxWidth: '320px', width: '280px' }}
                />
              </Suspense>
            )}
          </PopoverContent>
        </Popover>

        {/* Ô nhập nội dung tin nhắn */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            t('inputPlaceholder', 'Nhập tin nhắn...')
          }
          disabled={disabled || isSending || isUploading}
          rows={1}
          className="flex-1 resize-none bg-transparent py-2 px-2.5 text-sm text-white placeholder:text-[var(--rogym-text-dim)] focus:outline-none min-h-[38px] h-[38px] max-h-[120px] leading-5"
        />

        {/* Nút gửi */}
        <Tooltip content={t('send', 'Gửi')}>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!canSubmit}
            aria-label={t('send', 'Gửi')}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full transition-all shrink-0',
              canSubmit
                ? 'text-[var(--rogym-teal)] hover:text-emerald-400 hover:bg-[var(--rogym-teal)]/15 active:scale-95 cursor-pointer'
                : 'text-white/25 cursor-not-allowed pointer-events-none'
            )}
          >
            {isSending || isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[var(--rogym-teal)]" />
            ) : (
              <Send size={19} className="translate-x-[0.5px]" />
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
