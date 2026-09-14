import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dumbbell,
  History,
  RotateCcw,
  UserCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { vi, ja } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chat.store'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ChatInput } from '@/components/chat/ChatInput'

export default function MemberChatPage() {
  const { t, i18n } = useTranslation('chat')
  const isJa = i18n.language.startsWith('ja')
  const navigate = useNavigate()

  const user = useAuthStore((state) => state.user)
  const conversations = useChatStore((state) => state.conversations)
  const activeConversationId = useChatStore((state) => state.activeConversationId)
  const setActiveConversation = useChatStore((state) => state.setActiveConversation)
  const messagesByConversation = useChatStore((state) => state.messagesByConversation)
  const hasMoreByConversation = useChatStore((state) => state.hasMoreByConversation)
  const typingUsers = useChatStore((state) => state.typingUsers)
  const isLoadingConversations = useChatStore((state) => state.isLoadingConversations)
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages)
  const isUploading = useChatStore((state) => state.isUploading)

  const sendMessage = useChatStore((state) => state.sendMessage)
  const retrySendMessage = useChatStore((state) => state.retrySendMessage)
  const sendImage = useChatStore((state) => state.sendImage)
  const deleteMessage = useChatStore((state) => state.deleteMessage)
  const sendTyping = useChatStore((state) => state.sendTyping)
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages)
  const fetchActiveMemberConversation = useChatStore(
    (state) => state.fetchActiveMemberConversation
  )

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)

  // Cuộc trò chuyện với HLV chính hiện tại (status === 'active')
  const primaryConversation = useMemo(() => {
    return conversations.find((c) => c.status === 'active') || null
  }, [conversations])

  // Danh sách các cuộc trò chuyện với HLV cũ trong quá khứ (status === 'archived')
  const archivedConversations = useMemo(() => {
    return conversations.filter((c) => c.status === 'archived')
  }, [conversations])

  // Cuộc trò chuyện đang xem trên màn hình (có thể là active hoặc 1 trong các archived)
  const currentConversation = useMemo(() => {
    if (activeConversationId) {
      return conversations.find((c) => c.conversationId === activeConversationId) || null
    }
    return primaryConversation
  }, [conversations, activeConversationId, primaryConversation])

  // Tự động load hoặc chọn active conversation khi vào trang
  useEffect(() => {
    if (conversations.length === 0) {
      void fetchActiveMemberConversation()
    } else if (!activeConversationId && primaryConversation) {
      void setActiveConversation(primaryConversation.conversationId)
    }
  }, [conversations.length, activeConversationId, primaryConversation, fetchActiveMemberConversation, setActiveConversation])

  const isViewingArchived = currentConversation?.status === 'archived'

  // Xử lý khi hội viên chưa có HLV chính và chưa có bất kỳ cuộc trò chuyện nào
  if (!isLoadingConversations && conversations.length === 0 && !primaryConversation) {
    return (
      <div className="flex h-[calc(100vh-140px)] w-full items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[var(--rogym-bg-card)] p-8 text-center shadow-2xl">
          <EmptyState
            icon={<Dumbbell size={40} className="text-[var(--rogym-teal)]" />}
            title={t('noActiveTrainer', 'Bạn chưa có Huấn luyện viên chính')}
            description={t(
              'noActiveTrainerDesc',
              'Vui lòng chọn hoặc đăng ký gói dịch vụ Huấn luyện viên cá nhân để bắt đầu trao đổi lịch tập và chế độ dinh dưỡng.'
            )}
            actionLabel={t('chooseTrainerNow', 'Chọn Huấn luyện viên ngay')}
            onAction={() => navigate('/member/choose-trainer')}
            size="lg"
          />
        </div>
      </div>
    )
  }

  const activeMessages = currentConversation
    ? messagesByConversation[currentConversation.conversationId] || []
    : []

  const activeTypingForRoom = currentConversation
    ? typingUsers[currentConversation.conversationId] || {}
    : {}

  return (
    <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] w-full flex-col overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] shadow-[var(--rogym-shadow-glass)]">
      {/* Header trang Chat */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-3.5 bg-[var(--rogym-bg-card)]/90 backdrop-blur-md">
        {isLoadingConversations && !currentConversation ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ) : currentConversation ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar
              src={currentConversation.participant?.avatarUrl}
              name={currentConversation.participant?.fullName || t('trainer', 'Huấn luyện viên')}
              size="lg"
              status={isViewingArchived ? 'offline' : 'online'}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  {currentConversation.participant?.fullName || t('trainer', 'Huấn luyện viên')}
                </h2>
                {isViewingArchived ? (
                  <Badge tone="warning" size="xs">
                    {t('status.archived', 'Đã lưu trữ')}
                  </Badge>
                ) : (
                  <Badge tone="success" size="xs">
                    {t('primaryTrainerBadge', 'HLV chính')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--rogym-text-secondary)] truncate">
                {currentConversation.participant?.specialty || t('personalTrainer', 'Huấn luyện viên cá nhân')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Dumbbell size={20} className="text-[var(--rogym-teal)]" />
            <h2 className="text-base font-bold text-white">
              {t('chatWithTrainer', 'Trao đổi với Huấn luyện viên')}
            </h2>
          </div>
        )}

        {/* Các nút hành động Header */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Nút quay lại HLV chính nếu đang xem hội thoại lưu trữ cũ */}
          {isViewingArchived && primaryConversation && (
            <Button
              variant="outline-green"
              size="sm"
              onClick={() => setActiveConversation(primaryConversation.conversationId)}
              leftIcon={<RotateCcw size={14} />}
            >
              {t('backToPrimaryTrainer', 'Về HLV chính')}
            </Button>
          )}

          {/* Nút mở Lịch sử HLV cũ */}
          {archivedConversations.length > 0 && (
            <Button
              variant="outline-white"
              size="sm"
              onClick={() => setIsHistoryDrawerOpen(true)}
              leftIcon={<History size={14} />}
            >
              {t('previousTrainers', 'HLV trước đây')} ({archivedConversations.length})
            </Button>
          )}

          {/* Nút đổi PT */}
          <Button
            variant="text"
            size="sm"
            onClick={() => navigate('/member/choose-trainer')}
            leftIcon={<UserCheck size={14} />}
            className="text-[var(--rogym-teal)] hover:text-white"
          >
            {t('changeTrainer', 'Đổi HLV')}
          </Button>
        </div>
      </div>

      {/* Thông báo nếu đang ở chế độ xem lịch sử HLV cũ */}
      {isViewingArchived && (
        <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          <span>
            {t('viewingArchivedNotice', {
              name: currentConversation?.participant?.fullName || t('trainer', 'Huấn luyện viên'),
              defaultValue: `Bạn đang xem lại lịch sử tư vấn với ${currentConversation?.participant?.fullName || 'Huấn luyện viên'} (Chế độ chỉ đọc).`,
            })}
          </span>
          {primaryConversation && (
            <button
              type="button"
              onClick={() => setActiveConversation(primaryConversation.conversationId)}
              className="font-semibold underline hover:text-white ml-2 shrink-0"
            >
              {t('backToPrimaryTrainer', 'Về HLV chính')}
            </button>
          )}
        </div>
      )}

      {/* Khung tin nhắn chính */}
      <div className="flex-1 overflow-hidden flex flex-col">
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

            {/* Ô nhập tin nhắn (chỉ hiển thị khi cuộc trò chuyện active) */}
            {currentConversation.status === 'active' && (
              <div className="p-3 sm:p-4 border-t border-white/5 bg-[var(--rogym-bg-card)]">
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
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              icon={<Sparkles size={32} />}
              title={t('readyToChatTitle', 'Sẵn sàng trao đổi')}
              description={t('readyToChatDesc', 'Khung chat sẽ kết nối với Huấn luyện viên của bạn.')}
              size="md"
            />
          </div>
        )}
      </div>

      {/* Drawer xem danh sách các HLV cũ trong quá khứ */}
      <Sheet open={isHistoryDrawerOpen} onOpenChange={setIsHistoryDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-4 sm:p-6 border-b border-white/5">
            <SheetTitle className="text-white flex items-center gap-2">
              <History size={18} className="text-[var(--rogym-teal)]" />
              <span>{t('trainerHistoryTitle', 'Lịch sử Huấn luyện viên')}</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-[var(--rogym-text-secondary)]">
              {t(
                'trainerHistoryDesc',
                'Xem lại lịch sử tin nhắn, bài tập và lời khuyên dinh dưỡng từ các Huấn luyện viên trước đây.'
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {archivedConversations.map((conv) => {
              const isSelected = activeConversationId === conv.conversationId
              const lastDate = conv.lastMessageAt
                ? (() => {
                    try {
                      const d = parseISO(conv.lastMessageAt)
                      return isValid(d) ? format(d, isJa ? 'yyyy/MM/dd' : 'dd/MM/yyyy', { locale: isJa ? ja : vi }) : ''
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
                    setIsHistoryDrawerOpen(false)
                  }}
                  className={`flex w-full items-center gap-3.5 rounded-xl p-3 text-left transition-all border ${
                    isSelected
                      ? 'border-[var(--rogym-teal)]/40 bg-[var(--rogym-green)]/10 text-white'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/5 text-[var(--rogym-text-secondary)]'
                  }`}
                >
                  <Avatar
                    src={conv.participant?.avatarUrl}
                    name={conv.participant?.fullName || t('trainer', 'Huấn luyện viên')}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {conv.participant?.fullName || t('trainer', 'Huấn luyện viên')}
                      </h4>
                      {lastDate && (
                        <span className="text-[11px] text-[var(--rogym-text-dim)] shrink-0">
                          {lastDate}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--rogym-text-dim)] truncate mt-0.5">
                      {conv.lastMessageContent || t('noRecentMessages', 'Không có tin nhắn gần đây')}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-[var(--rogym-text-dim)] shrink-0" />
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
