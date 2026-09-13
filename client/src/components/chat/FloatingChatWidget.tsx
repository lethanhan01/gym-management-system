import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  MessageSquare,
  X,
  Maximize2,
  ArrowLeft,
  Dumbbell,
  Users,
} from 'lucide-react'
import { formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chat.store'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChatWindow } from './ChatWindow'
import { ChatInput } from './ChatInput'
import { cn } from '@/lib/utils'

export function FloatingChatWidget() {
  const { t } = useTranslation('chat')
  const navigate = useNavigate()
  const location = useLocation()

  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const isFloatingOpen = useChatStore((state) => state.isFloatingOpen)
  const toggleFloating = useChatStore((state) => state.toggleFloating)
  const closeFloating = useChatStore((state) => state.closeFloating)
  const conversations = useChatStore((state) => state.conversations)
  const activeConversationId = useChatStore((state) => state.activeConversationId)
  const setActiveConversation = useChatStore((state) => state.setActiveConversation)
  const unreadTotal = useChatStore((state) => state.unreadTotal)
  const messagesByConversation = useChatStore((state) => state.messagesByConversation)
  const hasMoreByConversation = useChatStore((state) => state.hasMoreByConversation)
  const typingUsers = useChatStore((state) => state.typingUsers)
  const isUploading = useChatStore((state) => state.isUploading)
  const isLoadingConversations = useChatStore((state) => state.isLoadingConversations)
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages)

  const sendMessage = useChatStore((state) => state.sendMessage)
  const retrySendMessage = useChatStore((state) => state.retrySendMessage)
  const sendImage = useChatStore((state) => state.sendImage)
  const deleteMessage = useChatStore((state) => state.deleteMessage)
  const sendTyping = useChatStore((state) => state.sendTyping)
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages)

  const [isTrainerListView, setIsTrainerListView] = useState(true)

  const isMember = user?.roles.includes('member') ?? false
  const isTrainer = user?.roles.some((r) => r === 'trainer' || (r as string) === 'pt') ?? false

  // Không hiển thị nếu chưa đăng nhập hoặc không phải Member/Trainer
  const isEligible = isAuthenticated && (isMember || isTrainer)

  // Ẩn nút nổi nếu đang ở chính trang chat toàn màn hình (/member/chat hoặc /trainer/chat)
  const isCurrentlyOnChatPage =
    location.pathname === '/member/chat' || location.pathname === '/trainer/chat'

  // Tìm cuộc trò chuyện đang được chọn
  const currentConversation = useMemo(() => {
    if (!activeConversationId) return null
    return conversations.find((c) => c.conversationId === activeConversationId) || null
  }, [conversations, activeConversationId])

  // Khi mở widget lần đầu với vai trò Member: tự động chọn active conversation nếu có
  useEffect(() => {
    if (isFloatingOpen && isMember && conversations.length > 0 && !activeConversationId) {
      const activeOne = conversations.find((c) => c.status === 'active') || conversations[0]
      if (activeOne) {
        void setActiveConversation(activeOne.conversationId)
      }
    }
  }, [isFloatingOpen, isMember, conversations, activeConversationId, setActiveConversation])

  if (!isEligible || isCurrentlyOnChatPage) {
    return null
  }

  // Chuyển hướng sang trang chat chuyên dụng
  const handleExpandToFullPage = () => {
    closeFloating()
    if (isMember) {
      navigate('/member/chat')
    } else {
      navigate('/trainer/chat')
    }
  }

  const activeMessages = activeConversationId
    ? messagesByConversation[activeConversationId] || []
    : []

  const activeTypingForRoom = activeConversationId
    ? typingUsers[activeConversationId] || {}
    : {}

  return (
    <>
      {/* Nút bong bóng tròn nổi ở góc dưới phải */}
      {!isFloatingOpen && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40">
          <button
            type="button"
            onClick={toggleFloating}
            className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--rogym-teal)] to-[var(--rogym-green)] text-black shadow-[0_8px_30px_rgba(66,224,158,0.35)] transition-all hover:scale-105 hover:shadow-[0_12px_36px_rgba(66,224,158,0.5)] active:scale-95 focus:outline-none"
            aria-label="Mở khung trò chuyện"
          >
            <MessageSquare size={26} className="transition-transform group-hover:scale-110" />

            {/* Badge số đỏ đếm unread count */}
            {unreadTotal > 0 && (
              <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white ring-2 ring-[var(--rogym-bg-base)] shadow-md animate-pulse">
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Popup Khung Chat nổi */}
      {isFloatingOpen && (
        <div
          data-testid="floating-chat-card"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex h-[520px] max-h-[82vh] w-[calc(100vw-32px)] sm:w-[380px] flex-col overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] shadow-[var(--rogym-shadow-glass)] backdrop-blur-2xl animate-in zoom-in-95 duration-200"
        >
          {/* Header Popup */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-[var(--rogym-bg-card)]/90 backdrop-blur-md">
            {/* Phía Trainer: Nút quay lại danh sách học viên */}
            {isTrainer && !isTrainerListView && (
              <Button
                variant="icon"
                size="sm"
                onClick={() => {
                  setIsTrainerListView(true)
                  setActiveConversation(null)
                }}
                className="h-8 w-8 text-[var(--rogym-text-secondary)] hover:text-white"
                aria-label="Danh sách học viên"
              >
                <ArrowLeft size={16} />
              </Button>
            )}

            {/* Thông tin đối phương hoặc tiêu đề */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
              {isMember && currentConversation ? (
                <>
                  <Avatar
                    src={currentConversation.participant?.avatarUrl}
                    name={currentConversation.participant?.fullName || 'Huấn luyện viên'}
                    size="sm"
                    status="online"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {currentConversation.participant?.fullName || 'Huấn luyện viên'}
                    </h3>
                    <p className="text-[11px] text-[var(--rogym-teal)] truncate">
                      Huấn luyện viên cá nhân
                    </p>
                  </div>
                </>
              ) : isTrainer && !isTrainerListView && currentConversation ? (
                <>
                  <Avatar
                    src={currentConversation.participant?.avatarUrl}
                    name={currentConversation.participant?.fullName || 'Học viên'}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {currentConversation.participant?.fullName || 'Học viên'}
                    </h3>
                    <p className="text-[11px] text-[var(--rogym-text-dim)] truncate">
                      Học viên
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--rogym-green)]/15 text-[var(--rogym-teal)]">
                    {isMember ? <Dumbbell size={16} /> : <Users size={16} />}
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {isMember ? t('chatWithTrainer', 'Trao đổi với HLV') : 'Tin nhắn học viên'}
                  </h3>
                  {unreadTotal > 0 && (
                    <Badge tone="primary" size="sm">
                      {unreadTotal}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Các nút điều khiển: Phóng to & Đóng */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="icon"
                size="sm"
                onClick={handleExpandToFullPage}
                title="Mở toàn màn hình"
                className="h-8 w-8 text-[var(--rogym-text-secondary)] hover:text-white"
                aria-label="Mở toàn màn hình"
              >
                <Maximize2 size={15} />
              </Button>
              <Button
                variant="icon"
                size="sm"
                onClick={closeFloating}
                title="Đóng"
                className="h-8 w-8 text-[var(--rogym-text-secondary)] hover:text-white"
                aria-label="Đóng"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Body Popup: Xử lý theo từng vai trò */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 1. Phía Member: Render ChatWindow trực tiếp với PT chính */}
            {isMember && (
              <>
                {currentConversation ? (
                  <>
                    <ChatWindow
                      conversation={currentConversation}
                      messages={activeMessages}
                      currentUserId={String(user?.userId || '')}
                      isLoading={isLoadingMessages}
                      hasMore={hasMoreByConversation[currentConversation.conversationId] || false}
                      typingUsers={activeTypingForRoom}
                      className="flex-1"
                      onLoadMore={() => loadMoreMessages(currentConversation.conversationId)}
                      onDeleteMessage={(msgId) =>
                        deleteMessage(currentConversation.conversationId, msgId)
                      }
                      onRetryMessage={(tempId) =>
                        retrySendMessage(currentConversation.conversationId, tempId)
                      }
                    />
                    {currentConversation.status === 'active' && (
                      <div className="p-2 border-t border-white/5 bg-[var(--rogym-bg-card)]">
                        <ChatInput
                          conversationId={currentConversation.conversationId}
                          isUploading={isUploading}
                          onSendMessage={(content) =>
                            sendMessage(currentConversation.conversationId, content)
                          }
                          onSendImage={(file) =>
                            sendImage(currentConversation.conversationId, file)
                          }
                          onTyping={(isTyping) =>
                            sendTyping(currentConversation.conversationId, isTyping)
                          }
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center p-4">
                    <EmptyState
                      icon={<Dumbbell size={32} />}
                      title={t('noActiveTrainer', 'Chưa có Huấn luyện viên')}
                      description={t(
                        'noActiveTrainerDesc',
                        'Vui lòng chọn hoặc đăng ký dịch vụ Huấn luyện viên cá nhân để bắt đầu trao đổi.'
                      )}
                      actionLabel="Chọn HLV ngay"
                      onAction={() => {
                        closeFloating()
                        navigate('/member/choose-trainer')
                      }}
                      size="sm"
                    />
                  </div>
                )}
              </>
            )}

            {/* 2. Phía Trainer: Danh sách học viên hoặc khung chat học viên đang chọn */}
            {isTrainer && (
              <>
                {isTrainerListView || !currentConversation ? (
                  /* Danh sách học viên */
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {isLoadingConversations && conversations.length === 0 ? (
                      <div className="space-y-2 p-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-center gap-3 p-2">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-1.5 flex-1">
                              <Skeleton className="h-3.5 w-28" />
                              <Skeleton className="h-3 w-40" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex h-full items-center justify-center p-4">
                        <EmptyState
                          icon={<Users size={32} />}
                          title={t('noConversations', 'Chưa có cuộc trò chuyện nào')}
                          description="Danh sách học viên sẽ xuất hiện khi bạn được phân công phụ trách."
                          size="sm"
                        />
                      </div>
                    ) : (
                      conversations.map((conv) => {
                        const timeAgo = conv.lastMessageAt
                          ? (() => {
                              try {
                                const d = parseISO(conv.lastMessageAt)
                                return isValid(d)
                                  ? formatDistanceToNow(d, { addSuffix: true, locale: vi })
                                  : ''
                              } catch {
                                return ''
                              }
                            })()
                          : ''

                        return (
                          <button
                            key={conv.conversationId}
                            type="button"
                            onClick={() => {
                              setActiveConversation(conv.conversationId)
                              setIsTrainerListView(false)
                            }}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors',
                              conv.unreadCount > 0
                                ? 'bg-white/10 hover:bg-white/15'
                                : 'hover:bg-white/5'
                            )}
                          >
                            <Avatar
                              src={conv.participant?.avatarUrl}
                              name={conv.participant?.fullName || 'Người dùng'}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-semibold text-white truncate">
                                  {conv.participant?.fullName || 'Người dùng'}
                                </h4>
                                {timeAgo && (
                                  <span className="text-[10px] text-[var(--rogym-text-dim)] shrink-0">
                                    {timeAgo}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-1 mt-0.5">
                                <p className="text-[11px] text-[var(--rogym-text-secondary)] truncate">
                                  {conv.lastMessageContent || 'Chưa có tin nhắn'}
                                </p>
                                {conv.unreadCount > 0 && (
                                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shrink-0">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                ) : (
                  /* Khung chat chi tiết của học viên */
                  <>
                    <ChatWindow
                      conversation={currentConversation}
                      messages={activeMessages}
                      currentUserId={String(user?.userId || '')}
                      isLoading={isLoadingMessages}
                      hasMore={hasMoreByConversation[currentConversation.conversationId] || false}
                      typingUsers={activeTypingForRoom}
                      className="flex-1"
                      onLoadMore={() => loadMoreMessages(currentConversation.conversationId)}
                      onDeleteMessage={(msgId) =>
                        deleteMessage(currentConversation.conversationId, msgId)
                      }
                      onRetryMessage={(tempId) =>
                        retrySendMessage(currentConversation.conversationId, tempId)
                      }
                    />
                    {currentConversation.status === 'active' && (
                      <div className="p-2 border-t border-white/5 bg-[var(--rogym-bg-card)]">
                        <ChatInput
                          conversationId={currentConversation.conversationId}
                          isUploading={isUploading}
                          onSendMessage={(content) =>
                            sendMessage(currentConversation.conversationId, content)
                          }
                          onSendImage={(file) =>
                            sendImage(currentConversation.conversationId, file)
                          }
                          onTyping={(isTyping) =>
                            sendTyping(currentConversation.conversationId, isTyping)
                          }
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default FloatingChatWidget

