import { useEffect, useRef, useState, useMemo } from 'react'
import {
  MoreVertical,
  CheckCheck,
  Clock,
  AlertCircle,
  RotateCcw,
  Trash2,
  Lock,
  MessageSquare,
  Sparkles,
  ChevronUp,
} from 'lucide-react'
import { format, isToday, isYesterday, isValid, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChatImageModal } from './ChatImageModal'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { ChatMessage, ConversationSummary } from '@/@types/chat'

export interface ChatWindowProps {
  conversation: ConversationSummary | null
  messages: ChatMessage[]
  currentUserId: string
  isLoading?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  typingUsers?: Record<string, { fullName: string; timestamp: number }>
  className?: string
  onLoadMore?: () => void
  onDeleteMessage?: (messageId: string) => Promise<void>
  onRetryMessage?: (tempId: string) => Promise<void>
}

// Hàm format thời gian tin nhắn
function formatMessageTime(dateStr: string): string {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
    return isValid(d) ? format(d, 'HH:mm') : ''
  } catch {
    return ''
  }
}

// Hàm format nhãn ngày phân nhóm
function formatDateSeparator(dateStr: string): string {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
    if (!isValid(d)) return ''
    if (isToday(d)) return 'Hôm nay'
    if (isYesterday(d)) return 'Hôm qua'
    return format(d, 'EEEE, dd/MM/yyyy', { locale: vi })
  } catch {
    return dateStr
  }
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  typingUsers = {},
  className,
  onLoadMore,
  onDeleteMessage,
  onRetryMessage,
}: ChatWindowProps) {
  const { t } = useTranslation('chat')
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null)

  // Modal xem ảnh
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Modal xác nhận thu hồi
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Phân nhóm tin nhắn theo ngày
  const groupedMessages = useMemo(() => {
    const groups: Array<{ dateKey: string; messages: ChatMessage[] }> = []
    let currentDateKey = ''
    let currentGroup: ChatMessage[] = []

    messages.forEach((msg) => {
      try {
        const d = parseISO(msg.createdAt)
        const dateKey = isValid(d) ? format(d, 'yyyy-MM-dd') : 'unknown'
        if (dateKey !== currentDateKey) {
          if (currentGroup.length > 0) {
            groups.push({ dateKey: currentDateKey, messages: currentGroup })
          }
          currentDateKey = dateKey
          currentGroup = [msg]
        } else {
          currentGroup.push(msg)
        }
      } catch {
        currentGroup.push(msg)
      }
    })

    if (currentGroup.length > 0) {
      groups.push({ dateKey: currentDateKey, messages: currentGroup })
    }

    return groups
  }, [messages])

  // Danh sách người đang gõ trong cuộc trò chuyện này
  const activeTypers = useMemo(() => {
    return Object.values(typingUsers).filter(Boolean)
  }, [typingUsers])

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    // Cuộn xuống đáy mượt mà
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, activeTypers.length])

  // Xác nhận thu hồi tin nhắn
  const handleConfirmDelete = async () => {
    if (!deletingMessageId || !onDeleteMessage) return
    setIsDeleting(true)
    try {
      await onDeleteMessage(deletingMessageId)
      setDeletingMessageId(null)
    } finally {
      setIsDeleting(false)
    }
  }

  // Trường hợp chưa chọn cuộc trò chuyện
  if (!conversation) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center p-6', className)}>
        <EmptyState
          icon={<MessageSquare size={36} />}
          title={t('selectStudent', 'Chọn cuộc trò chuyện để bắt đầu')}
          description="Chọn một cuộc trò chuyện từ danh sách hoặc nhắn tin trực tiếp với Huấn luyện viên."
          size="lg"
        />
      </div>
    )
  }

  const isArchived = conversation.status === 'archived'

  return (
    <div className={cn('relative flex h-full flex-col overflow-hidden bg-black/20', className)}>
      {/* Banner thông báo nếu hội thoại đã lưu trữ */}
      {isArchived && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 py-2.5 px-4 text-xs font-medium text-amber-300">
          <Lock size={14} className="shrink-0" />
          <span>{t('archivedNotice', 'Cuộc trò chuyện đã lưu trữ (chế độ chỉ đọc).')}</span>
        </div>
      )}

      {/* Khu vực cuộn tin nhắn */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
      >
        {/* Nút nạp thêm tin nhắn cũ */}
        {hasMore && (
          <div className="flex justify-center pt-1 pb-2">
            <Button
              variant="outline-white"
              size="xs"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              loading={isLoadingMore}
              leftIcon={<ChevronUp size={13} />}
            >
              {t('loadMore', 'Tải thêm tin nhắn cũ')}
            </Button>
          </div>
        )}

        {/* Skeleton loading khi tải lần đầu */}
        {isLoading && messages.length === 0 && (
          <div className="space-y-4 py-6">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="space-y-2 max-w-[60%]">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-14 w-64 rounded-2xl" />
              </div>
            </div>
            <div className="flex items-start justify-end gap-3">
              <div className="space-y-2 max-w-[60%] flex flex-col items-end">
                <Skeleton className="h-12 w-48 rounded-2xl" />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="space-y-2 max-w-[60%]">
                <Skeleton className="h-20 w-72 rounded-2xl" />
              </div>
            </div>
          </div>
        )}

        {/* Trạng thái rỗng khi không có tin nhắn nào */}
        {!isLoading && messages.length === 0 && (
          <div className="flex h-full min-h-[260px] items-center justify-center">
            <EmptyState
              icon={<Sparkles size={28} />}
              title={t('noMessages', 'Chưa có tin nhắn nào')}
              description="Hãy gửi lời chào đầu tiên để bắt đầu trao đổi!"
              size="sm"
            />
          </div>
        )}

        {/* Danh sách tin nhắn theo nhóm ngày */}
        {groupedMessages.map((group) => (
          <div key={group.dateKey} className="space-y-3">
            {/* Phân cách ngày */}
            {group.dateKey !== 'unknown' && (
              <div className="flex items-center justify-center my-4">
                <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-medium text-[var(--rogym-text-secondary)] shadow-sm">
                  {formatDateSeparator(group.dateKey)}
                </span>
              </div>
            )}

            {/* Các tin nhắn trong ngày */}
            {group.messages.map((msg) => {
              const isMine =
                msg.isSender ||
                String(msg.senderUserId) === String(currentUserId) ||
                msg.deliveryStatus === 'sending' ||
                msg.deliveryStatus === 'failed'

              const timeStr = formatMessageTime(msg.createdAt)
              const isFailed = msg.deliveryStatus === 'failed'
              const isSending = msg.deliveryStatus === 'sending'

              return (
                <div
                  key={msg.messageId || msg.tempId}
                  className={cn(
                    'group relative flex items-end gap-2 text-sm',
                    isMine ? 'justify-end' : 'justify-start'
                  )}
                >
                  {/* Avatar của đối phương (bên trái) */}
                  {!isMine && (
                    <Avatar
                      src={msg.senderAvatarUrl || conversation.participant?.avatarUrl}
                      name={msg.senderName || conversation.participant?.fullName || 'Người gửi'}
                      size="sm"
                      className="mb-1 shrink-0"
                    />
                  )}

                  {/* Menu hành động 3 chấm trên tin nhắn của mình (xuất hiện khi hover) */}
                  {isMine && !isSending && !isFailed && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center mb-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="icon"
                            size="sm"
                            className="h-7 w-7 p-0 text-[var(--rogym-text-dim)] hover:text-white rounded-lg"
                            aria-label="Tùy chọn tin nhắn"
                          >
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="top">
                          <DropdownMenuItem
                            destructive
                            onClick={() => setDeletingMessageId(msg.messageId)}
                            className="text-xs gap-2"
                          >
                            <Trash2 size={13} />
                            <span>{t('deleteMessage', 'Thu hồi tin nhắn')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {/* Bong bóng tin nhắn */}
                  <div
                    className={cn(
                      'relative max-w-[78%] sm:max-w-[70%] rounded-2xl p-3 shadow-md transition-all',
                      isMine
                        ? 'bg-[var(--rogym-green)]/15 border border-[var(--rogym-teal)]/30 text-white rounded-br-xs'
                        : 'bg-[var(--rogym-bg-card)] border border-white/5 text-white/95 rounded-bl-xs'
                    )}
                  >
                    {/* Hiển thị tên người gửi nếu là tin đối phương */}
                    {!isMine && (
                      <div className="mb-1 text-xs font-semibold text-[var(--rogym-teal)]">
                        {msg.senderName || conversation.participant?.fullName || 'Người gửi'}
                      </div>
                    )}

                    {/* Nội dung tin nhắn: Text hoặc Image */}
                    {msg.messageType === 'image' && msg.attachmentUrl ? (
                      <div className="space-y-1">
                        <div
                          className="relative overflow-hidden rounded-xl cursor-pointer group/img max-h-[300px] border border-white/10"
                          onClick={() => setSelectedImage(msg.attachmentUrl)}
                        >
                          <img
                            src={msg.attachmentUrl}
                            alt="Đính kèm"
                            className="w-full h-auto object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                            {t('viewImage', 'Xem ảnh')}
                          </div>
                        </div>
                        {msg.content && msg.content !== '[Hình ảnh]' && (
                          <p className="text-sm whitespace-pre-wrap break-words mt-1 leading-relaxed">
                            {msg.content}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                    )}

                    {/* Thời gian và Trạng thái gửi tin */}
                    <div
                      className={cn(
                        'mt-1.5 flex items-center gap-1.5 text-[10px]',
                        isMine ? 'justify-end text-[var(--rogym-text-secondary)]' : 'text-[var(--rogym-text-dim)]'
                      )}
                    >
                      <span>{timeStr}</span>
                      {isMine && (
                        <span>
                          {isSending && <Clock size={11} className="text-amber-400 animate-spin" />}
                          {isFailed && (
                            <span className="flex items-center gap-1 text-red-400">
                              <AlertCircle size={11} />
                              <span>{t('sendFailed', 'Lỗi')}</span>
                            </span>
                          )}
                          {!isSending && !isFailed && (
                            <CheckCheck size={13} className="text-[var(--rogym-teal)]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nút thử lại nếu gửi thất bại */}
                  {isFailed && msg.tempId && onRetryMessage && (
                    <Button
                      variant="text"
                      size="sm"
                      onClick={() => onRetryMessage(msg.tempId!)}
                      className="h-8 px-2 text-xs text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg shrink-0"
                      title={t('retry', 'Thử lại')}
                    >
                      <RotateCcw size={13} className="mr-1" />
                      {t('retry', 'Thử lại')}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Chỉ báo Typing Indicator */}
        {activeTypers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-[var(--rogym-text-secondary)] pl-2 pt-1 animate-fade-in">
            <Avatar
              name={activeTypers[0].fullName}
              size="xs"
              className="shrink-0"
            />
            <div className="flex items-center gap-1.5 rounded-2xl bg-[var(--rogym-bg-card)] border border-white/5 py-2 px-3">
              <span className="font-medium text-white/80">{activeTypers[0].fullName}</span>
              <span className="text-[var(--rogym-text-dim)]">{t('someoneTyping', 'đang nhập')}</span>
              <span className="flex gap-1 items-center ml-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--rogym-teal)] animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--rogym-teal)] animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--rogym-teal)] animate-bounce" />
              </span>
            </div>
          </div>
        )}

        {/* Điểm neo để tự động cuộn xuống cuối */}
        <div ref={bottomAnchorRef} />
      </div>

      {/* Modal phóng to xem ảnh */}
      <ChatImageModal
        open={Boolean(selectedImage)}
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {/* Hộp thoại xác nhận thu hồi tin nhắn */}
      <ConfirmDialog
        open={Boolean(deletingMessageId)}
        onClose={() => setDeletingMessageId(null)}
        onConfirm={handleConfirmDelete}
        title={t('deleteConfirmTitle', 'Thu hồi tin nhắn này?')}
        description={t(
          'deleteConfirmDesc',
          'Tin nhắn sẽ bị xóa vĩnh viễn khỏi cuộc trò chuyện của cả hai bên. Hành động này không thể hoàn tác.'
        )}
        confirmLabel={t('confirmDelete', 'Thu hồi')}
        cancelLabel={t('cancel', 'Hủy')}
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
