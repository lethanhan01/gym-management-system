import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dumbbell,
  History,
  RotateCcw,
  Eye,
  Award,
  ChevronRight,
  Sparkles,
  CreditCard,
  Users,
} from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { vi, ja } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chat.store'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ChatInput } from '@/components/chat/ChatInput'
import TrainerReviewsModal, { type TrainerModalTarget } from '@/pages/member/components/TrainerReviewsModal'

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
  const isLoadingMessages = useChatStore((state) => state.isLoadingMessages)
  const isUploading = useChatStore((state) => state.isUploading)
  const memberChatEligibility = useChatStore((state) => state.memberChatEligibility)

  const sendMessage = useChatStore((state) => state.sendMessage)
  const retrySendMessage = useChatStore((state) => state.retrySendMessage)
  const sendImage = useChatStore((state) => state.sendImage)
  const deleteMessage = useChatStore((state) => state.deleteMessage)
  const sendTyping = useChatStore((state) => state.sendTyping)
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages)
  const fetchConversations = useChatStore((state) => state.fetchConversations)
  const fetchActiveMemberConversation = useChatStore(
    (state) => state.fetchActiveMemberConversation
  )

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)
  const [isTrainerProfileOpen, setIsTrainerProfileOpen] = useState(false)

  // Cuộc trò chuyện với HLV chính hiện tại (status === 'active')
  const primaryConversation = useMemo(() => {
    return conversations.find((c) => c.status === 'active') || null
  }, [conversations])

  // Danh sách các cuộc trò chuyện với HLV cũ trong quá khứ (status === 'archived')
  const archivedConversations = useMemo(() => {
    return conversations.filter((c) => c.status === 'archived')
  }, [conversations])

  // Cuộc trò chuyện đang xem trên màn hình (active hoặc 1 trong các archived)
  const currentConversation = useMemo(() => {
    if (activeConversationId) {
      const found = conversations.find((c) => c.conversationId === activeConversationId)
      if (found) return found
    }
    return primaryConversation || null
  }, [conversations, activeConversationId, primaryConversation])

  // Dữ liệu HLV cơ bản để mở TrainerReviewsModal
  // Modal sẽ tự fetch đầy đủ 100% dữ liệu từ Backend API (detail.trainer)
  const trainerForModal = useMemo((): TrainerModalTarget | null => {
    const p = primaryConversation?.participant
    if (!p?.staffId) return null
    return {
      staffId: p.staffId,
      fullName: p.fullName,
      avatarUrl: p.avatarUrl ?? null,
      specialty: p.specialty ?? null,
    }
  }, [primaryConversation])

  // Tải danh sách và tự động kết nối hội thoại active khi vào trang
  useEffect(() => {
    let isMounted = true
    setIsInitialLoading(true)

    Promise.all([
      fetchConversations(),
      fetchActiveMemberConversation(),
    ]).finally(() => {
      if (isMounted) {
        setIsInitialLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [fetchConversations, fetchActiveMemberConversation])

  const isViewingArchived = currentConversation?.status === 'archived'

  const activeMessages = currentConversation
    ? messagesByConversation[currentConversation.conversationId] || []
    : []

  const activeTypingForRoom = currentConversation
    ? typingUsers[currentConversation.conversationId] || {}
    : {}

  // =========================================================================
  // RENDER HEADER
  // =========================================================================
  const renderHeader = () => {
    if (isInitialLoading) {
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      )
    }

    if (isViewingArchived && currentConversation) {
      return (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar
            src={currentConversation.participant?.avatarUrl}
            name={currentConversation.participant?.fullName || t('trainer', 'Huấn luyện viên')}
            size="md"
            status="offline"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {currentConversation.participant?.fullName || t('trainer', 'Huấn luyện viên')}
              </h2>
              <Badge tone="warning" size="xs" className="shrink-0">
                {t('status.archived', 'Đã lưu trữ')}
              </Badge>
            </div>
            <p className="text-xs text-[var(--rogym-text-secondary)] truncate">
              {currentConversation.participant?.specialty || t('personalTrainer', 'Huấn luyện viên cá nhân')}
            </p>
          </div>
        </div>
      )
    }

    if (memberChatEligibility === 'READY' && currentConversation) {
      return (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar
            src={currentConversation.participant?.avatarUrl}
            name={currentConversation.participant?.fullName || t('trainer', 'Huấn luyện viên')}
            size="md"
            status="online"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                {currentConversation.participant?.fullName || t('trainer', 'Huấn luyện viên')}
              </h2>
              <Badge tone="success" size="xs" className="shrink-0">
                {t('primaryTrainerBadge', 'HLV chính')}
              </Badge>
            </div>
            <p className="text-xs text-[var(--rogym-text-secondary)] truncate">
              {currentConversation.participant?.specialty || t('personalTrainer', 'Huấn luyện viên cá nhân')}
            </p>
          </div>
        </div>
      )
    }

    // Default header cho các trạng thái chưa đủ điều kiện
    return (
      <div className="flex items-center gap-2">
        <Dumbbell size={20} className="text-[var(--rogym-teal)] shrink-0" />
        <h2 className="text-base font-bold text-white truncate">
          {t('chatWithTrainer', 'Trao đổi với Huấn luyện viên')}
        </h2>
      </div>
    )
  }

  // =========================================================================
  // RENDER CONTENT BODY
  // =========================================================================
  const renderContentBody = () => {
    if (isInitialLoading) {
      return (
        <div className="flex-1 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-16 w-64 rounded-2xl" />
            </div>
          </div>
          <div className="flex items-start justify-end gap-3">
            <div className="space-y-2 flex flex-col items-end">
              <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-20 w-72 rounded-2xl" />
            </div>
          </div>
        </div>
      )
    }

    // Nếu đang xem hội thoại lưu trữ cũ (chế độ chỉ đọc)
    if (isViewingArchived && currentConversation) {
      return (
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
      )
    }

    // 1. Trạng thái chưa có gói tập hoạt động
    if (memberChatEligibility === 'NO_ACTIVE_SUBSCRIPTION') {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/20 p-8 text-center shadow-xl backdrop-blur-sm">
            <EmptyState
              icon={<CreditCard size={40} className="text-[var(--rogym-teal)]" />}
              title={t('noActiveSubTitle', 'Bạn chưa có gói tập hoạt động')}
              description={t(
                'noActiveSubDesc',
                'Vui lòng đăng ký gói tập để sử dụng dịch vụ và kết nối trao đổi với Huấn luyện viên cá nhân.'
              )}
              actionLabel={t('subscribeNow', 'Đăng ký gói tập ngay')}
              onAction={() => navigate('/member/subscription/setup')}
              size="lg"
            />
          </div>
        </div>
      )
    }

    // 2. Trạng thái gói tập không có PT
    if (memberChatEligibility === 'NO_PT_PACKAGE') {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/20 p-8 text-center shadow-xl backdrop-blur-sm">
            <EmptyState
              icon={<Award size={40} className="text-[var(--rogym-teal)]" />}
              title={t('noPtPackageTitle', 'Gói tập hiện tại không bao gồm Huấn luyện viên')}
              description={t(
                'noPtPackageDesc',
                'Nâng cấp lên gói tập có Huấn luyện viên cá nhân (PT) để được tư vấn lộ trình, bài tập và trao đổi trực tiếp 1:1.'
              )}
              actionLabel={t('upgradePtPackage', 'Nâng cấp gói tập có PT')}
              onAction={() => navigate('/member/subscription/setup')}
              size="lg"
            />
          </div>
        </div>
      )
    }

    // 3. Trạng thái có gói PT nhưng chưa chọn PT
    if (memberChatEligibility === 'PT_NOT_SELECTED') {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/20 p-8 text-center shadow-xl backdrop-blur-sm">
            <EmptyState
              icon={<Users size={40} className="text-[var(--rogym-teal)]" />}
              title={t('ptNotSelectedTitle', 'Bạn chưa chọn Huấn luyện viên cá nhân')}
              description={t(
                'ptNotSelectedDesc',
                'Gói tập của bạn đã sẵn sàng hỗ trợ 1:1. Hãy chọn Huấn luyện viên phù hợp để bắt đầu lộ trình tập luyện!'
              )}
              actionLabel={t('selectTrainerNow', 'Chọn Huấn luyện viên ngay')}
              onAction={() => navigate('/member/choose-trainer')}
              size="lg"
            />
          </div>
        </div>
      )
    }

    // 4. Trạng thái đủ điều kiện READY: Đã có cuộc trò chuyện active
    if (currentConversation) {
      return (
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
      )
    }

    // Fallback nếu không khớp trạng thái nào
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          icon={<Sparkles size={32} />}
          title={t('readyToChatTitle', 'Sẵn sàng trao đổi')}
          description={t('readyToChatDesc', 'Khung chat sẽ kết nối với Huấn luyện viên của bạn.')}
          size="md"
        />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] w-full flex-col overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-[var(--rogym-bg-card)] shadow-[var(--rogym-shadow-glass)]">
      {/* Header trang Chat */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-3.5 bg-[var(--rogym-bg-card)]/90 backdrop-blur-md">
        {renderHeader()}

        {/* Các nút hành động Header */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-2">
          {/* Nút quay lại HLV chính nếu đang xem hội thoại lưu trữ cũ */}
          {isViewingArchived && primaryConversation && (
            <Tooltip content={t('backToPrimaryTrainer', 'Về HLV chính')}>
              <button
                type="button"
                onClick={() => setActiveConversation(primaryConversation.conversationId)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 active:scale-95 transition-all shrink-0"
                aria-label={t('backToPrimaryTrainer', 'Về HLV chính')}
              >
                <RotateCcw size={18} />
              </button>
            </Tooltip>
          )}

          {/* Nút mở Lịch sử HLV cũ (nếu có lịch sử lưu trữ) */}
          {archivedConversations.length > 0 && (
            <Tooltip content={`${t('previousTrainers', 'HLV trước đây')} (${archivedConversations.length})`}>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(true)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--rogym-text-secondary)] hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
                aria-label={`${t('previousTrainers', 'HLV trước đây')} (${archivedConversations.length})`}
              >
                <History size={18} />
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--rogym-teal)] text-[9px] font-bold text-black px-1 shadow-sm">
                  {archivedConversations.length}
                </span>
              </button>
            </Tooltip>
          )}

          {/* Nút xem hồ sơ & đánh giá HLV: Hiển thị khi READY, không xem archived, và có staffId */}
          {memberChatEligibility === 'READY' && !isViewingArchived && trainerForModal && (
            <Tooltip content={t('viewTrainerProfile', 'Hồ sơ & đánh giá HLV')}>
              <button
                type="button"
                onClick={() => setIsTrainerProfileOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--rogym-text-secondary)] hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
                aria-label={t('viewTrainerProfile', 'Hồ sơ & đánh giá HLV')}
              >
                <Eye size={16} />
              </button>
            </Tooltip>
          )}
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
        {renderContentBody()}
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

      {/* Modal xem hồ sơ & đánh giá HLV hiện tại (read-only, không có nút Chọn HLV) */}
      <TrainerReviewsModal
        open={isTrainerProfileOpen}
        onClose={() => setIsTrainerProfileOpen(false)}
        trainer={trainerForModal}
        readOnly
      />
    </div>
  )
}
