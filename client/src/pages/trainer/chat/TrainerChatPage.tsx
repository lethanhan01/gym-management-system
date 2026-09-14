import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  ArrowLeft,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { vi, ja } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chat.store'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ChatInput } from '@/components/chat/ChatInput'
import { cn } from '@/lib/utils'

export default function TrainerChatPage() {
  const { t, i18n } = useTranslation('chat')
  const isJa = i18n.language.startsWith('ja')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

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

  const fetchConversations = useChatStore((state) => state.fetchConversations)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const retrySendMessage = useChatStore((state) => state.retrySendMessage)
  const sendImage = useChatStore((state) => state.sendImage)
  const deleteMessage = useChatStore((state) => state.deleteMessage)
  const sendTyping = useChatStore((state) => state.sendTyping)
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages)

  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)

  // Nạp danh sách học viên khi vào trang
  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  // Xử lý query param `memberId` hoặc `conversationId` từ URL
  const targetMemberId = searchParams.get('memberId')
  const targetConvId = searchParams.get('conversationId')

  useEffect(() => {
    if (conversations.length === 0) return

    if (targetConvId) {
      const found = conversations.find((c) => c.conversationId === targetConvId)
      if (found && activeConversationId !== found.conversationId) {
        void setActiveConversation(found.conversationId)
        setIsMobileChatOpen(true)
      }
      return
    }

    if (targetMemberId) {
      const found = conversations.find(
        (c) =>
          c.participant.memberId === targetMemberId ||
          c.participant.userId === targetMemberId ||
          c.participant.memberCode === targetMemberId
      )
      if (found && activeConversationId !== found.conversationId) {
        void setActiveConversation(found.conversationId)
        setIsMobileChatOpen(true)
      }
      return
    }

    // Tự động chọn cuộc trò chuyện đầu tiên trên Desktop nếu chưa chọn ai
    if (!activeConversationId && conversations.length > 0) {
      void setActiveConversation(conversations[0].conversationId)
    }
  }, [conversations, targetConvId, targetMemberId, activeConversationId, setActiveConversation])

  // Lọc danh sách học viên theo từ khóa tìm kiếm (Tên, Mã học viên, Member ID)
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) =>
        c.participant.fullName.toLowerCase().includes(q) ||
        (c.participant.memberCode && c.participant.memberCode.toLowerCase().includes(q)) ||
        (c.participant.memberId && c.participant.memberId.toLowerCase().includes(q))
    )
  }, [conversations, searchQuery])

  // Cuộc trò chuyện đang được chọn
  const currentConversation = useMemo(() => {
    if (!activeConversationId) return null
    return conversations.find((c) => c.conversationId === activeConversationId) || null
  }, [conversations, activeConversationId])

  const handleSelectConversation = (convId: string) => {
    void setActiveConversation(convId)
    setIsMobileChatOpen(true)
    setSearchParams({ conversationId: convId })
  }

  const activeMessages = activeConversationId
    ? messagesByConversation[activeConversationId] || []
    : []

  const activeTypingForRoom = activeConversationId
    ? typingUsers[activeConversationId] || {}
    : {}

  return (
    <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] w-full overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] shadow-[var(--rogym-shadow-glass)]">
      {/* CỘT TRÁI: DANH SÁCH HỌC VIÊN */}
      <div
        className={cn(
          'w-full md:w-80 lg:w-96 flex flex-col border-r border-white/5 bg-[var(--rogym-bg-card)]/90 backdrop-blur-md shrink-0 transition-all',
          isMobileChatOpen && currentConversation ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Header danh sách học viên */}
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[var(--rogym-teal)]" />
              <h2 className="text-base font-bold text-white">
                {t('studentMessages', 'Tin nhắn học viên')}
              </h2>
            </div>
            <Badge tone="primary" size="xs">
              {conversations.length}
            </Badge>
          </div>

          {/* Thanh tìm kiếm học viên */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('searchStudents', 'Tìm theo tên, mã học viên...')}
            inputSize="sm"
          />
        </div>

        {/* Danh sách các cuộc trò chuyện */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingConversations && conversations.length === 0 ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2.5">
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4">
              <EmptyState
                icon={<Search size={28} />}
                title={
                  searchQuery
                    ? t('noSearchResult', 'Không tìm thấy học viên')
                    : t('noConversations', 'Chưa có cuộc trò chuyện nào')
                }
                description={
                  searchQuery
                    ? t('noSearchResultDesc', {
                        query: searchQuery,
                        defaultValue: `Không có kết quả nào phù hợp với từ khóa "${searchQuery}"`,
                      })
                    : t(
                        'noConversationsTrainerDesc',
                        'Danh sách học viên sẽ xuất hiện khi bạn được phân công phụ trách.'
                      )
                }
                size="sm"
              />
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConversationId === conv.conversationId
              const isNewConversation = !conv.lastMessageAt && !conv.lastMessageContent
              const timeAgo = conv.lastMessageAt
                ? (() => {
                    try {
                      const d = parseISO(conv.lastMessageAt)
                      return isValid(d)
                        ? formatDistanceToNow(d, { addSuffix: true, locale: isJa ? ja : vi })
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
                  onClick={() => handleSelectConversation(conv.conversationId)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all border',
                    isSelected
                      ? 'border-[var(--rogym-teal)]/40 bg-[var(--rogym-green)]/10 text-white shadow-sm'
                      : 'border-transparent hover:bg-white/5 text-[var(--rogym-text-secondary)]',
                    conv.unreadCount > 0 && !isSelected && 'bg-white/[0.04]'
                  )}
                >
                  <Avatar
                    src={conv.participant.avatarUrl}
                    name={conv.participant.fullName}
                    size="md"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={cn(
                          'text-sm font-semibold truncate',
                          isSelected || conv.unreadCount > 0 ? 'text-white' : 'text-white/90'
                        )}
                      >
                        {conv.participant.fullName}
                      </h4>
                      {timeAgo ? (
                        <span className="text-[10px] text-[var(--rogym-text-dim)] shrink-0">
                          {timeAgo}
                        </span>
                      ) : isNewConversation ? (
                        <Badge tone="primary" size="xs" className="text-[9px] px-1 py-0 h-4">
                          {t('newBadge', 'Mới')}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p
                        className={cn(
                          'text-xs truncate',
                          conv.unreadCount > 0
                            ? 'text-white font-medium'
                            : isNewConversation
                            ? 'text-[var(--rogym-text-dim)] italic'
                            : 'text-[var(--rogym-text-dim)]'
                        )}
                      >
                        {conv.lastMessageContent || t('noMessagesShort', 'Chưa có tin nhắn')}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shrink-0 shadow-sm">
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
      </div>

      {/* CỘT PHẢI: KHUNG CHAT CHI TIẾT */}
      <div
        className={cn(
          'flex-1 flex flex-col bg-black/10 overflow-hidden',
          !isMobileChatOpen && !currentConversation ? 'hidden md:flex' : 'flex'
        )}
      >
        {currentConversation ? (
          <>
            {/* Header khung chat học viên */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-6 bg-[var(--rogym-bg-card)]/90 backdrop-blur-md gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Nút quay lại trên Mobile */}
                <Tooltip content={t('studentList', 'Quay lại danh sách')}>
                  <button
                    type="button"
                    onClick={() => setIsMobileChatOpen(false)}
                    className="md:hidden flex h-8 w-8 items-center justify-center rounded-full text-[var(--rogym-text-secondary)] hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
                    aria-label={t('studentList', 'Quay lại danh sách')}
                  >
                    <ArrowLeft size={18} />
                  </button>
                </Tooltip>

                <Avatar
                  src={currentConversation.participant.avatarUrl}
                  name={currentConversation.participant.fullName}
                  size="md"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      {currentConversation.participant.fullName}
                    </h3>
                    <Badge tone="muted" size="xs" className="shrink-0">
                      {t('student', 'Học viên')}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--rogym-text-secondary)] truncate">
                    {t('managedStudent', 'Hội viên phụ trách')}
                  </p>
                </div>
              </div>

              {/* Nút xem chi tiết học viên */}
              {currentConversation.participant.memberId && (
                <Tooltip content={t('studentProfile', 'Hồ sơ học viên')} side="bottom">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/trainer/students/${currentConversation.participant.memberId}`)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--rogym-teal)] hover:text-emerald-400 hover:bg-white/10 active:scale-95 transition-all shrink-0 ml-2"
                    aria-label={t('studentProfile', 'Hồ sơ học viên')}
                  >
                    <ExternalLink size={18} />
                  </button>
                </Tooltip>
              )}
            </div>

            {/* Khung chat */}
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

            {/* Ô nhập tin nhắn */}
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
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <EmptyState
              icon={<MessageSquare size={40} />}
              title={t('selectStudent', 'Chọn học viên để bắt đầu trò chuyện')}
              description={t(
                'selectStudentDesc',
                'Chọn một cuộc trò chuyện từ danh sách hoặc nhắn tin trực tiếp với Huấn luyện viên.'
              )}
              size="lg"
            />
          </div>
        )}
      </div>
    </div>
  )
}
