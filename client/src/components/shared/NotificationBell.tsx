import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { NotificationPanel } from '@/components/shared/NotificationUI'
import { translateNotification } from '@/lib/notification-i18n'
import { notificationService, type NotificationItem } from '@/services/notification.service'
import { useAuthStore, type Role } from '@/stores/authStore'
import { showRealtimeNotificationToast } from './notification-toast'

const POLL_INTERVAL_MS = 20_000
const TOAST_COOLDOWN_MS = 4_000

function toNumberId(id: string) {
  const parsed = Number(id)
  return Number.isFinite(parsed) ? parsed : 0
}

type Translate = (key: string, options?: Record<string, unknown>) => string

function relativeTime(value: string, t: Translate) {
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60_000))
  if (minutes < 1) return t('notification.time.justNow')
  if (minutes < 60) return t('notification.time.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('notification.time.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('notification.time.daysAgo', { count: days })
}

function mergeNotifications(current: NotificationItem[], incoming: NotificationItem[]) {
  const map = new Map<string, NotificationItem>()
  for (const item of [...incoming, ...current]) {
    map.set(item.notificationId, item)
  }
  return Array.from(map.values())
    .sort((a, b) => toNumberId(b.notificationId) - toNumberId(a.notificationId))
    .slice(0, 20)
}

function getEffectiveRole(roles: Role[] | undefined, pathname: string): Role | undefined {
  if (!roles?.length) return undefined
  if (pathname.startsWith('/owner') && roles.includes('owner')) return 'owner'
  if (pathname.startsWith('/staff') && (roles.includes('staff') || roles.includes('owner'))) return 'staff'
  if (pathname.startsWith('/trainer') && roles.includes('trainer')) return 'trainer'
  if (pathname.startsWith('/member') && roles.includes('member')) return 'member'
  if (roles.includes('owner')) return 'owner'
  if (roles.includes('staff')) return 'staff'
  if (roles.includes('trainer')) return 'trainer'
  if (roles.includes('member')) return 'member'
  return roles[0]
}

function getNotificationPath(item: NotificationItem, roles: Role[] | undefined, pathname: string) {
  const effectiveRole = getEffectiveRole(roles, pathname)

  switch (item.resourceType) {
    case 'training_session':
      if (effectiveRole === 'trainer') return '/trainer/sessions'
      if (effectiveRole === 'member') {
        const sessionId = item.resourceId
        return sessionId && /^[1-9]\d*$/.test(sessionId)
          ? `/member/workout/sessions?sessionId=${sessionId}`
          : '/member/workout/sessions'
      }
      if (effectiveRole === 'staff') return '/staff/schedules'
      if (effectiveRole === 'owner') return '/owner/staff/schedules'
      return null
    case 'subscription':
      if (effectiveRole === 'member') return '/member/subscription/current'
      if (effectiveRole === 'staff') return '/staff/renewal'
      if (effectiveRole === 'owner') return '/owner/reports/transaction-invoices'
      return null
    case 'payment':
      if (effectiveRole === 'member') return '/member/subscription/history'
      if (effectiveRole === 'owner') return '/owner/reports/transaction-invoices'
      if (effectiveRole === 'staff') return '/staff/renewal'
      return null
    case 'attendance_log':
      if (effectiveRole === 'member') return '/member/attendance'
      if (effectiveRole === 'trainer') return '/trainer/students'
      if (effectiveRole === 'staff') return '/staff/attendance'
      if (effectiveRole === 'owner') return '/owner/reports/employee-performance'
      return null
    case 'feedback':
      if (effectiveRole === 'member') return '/member/feedback'
      if (effectiveRole === 'staff') return '/staff/feedback'
      if (effectiveRole === 'owner') return '/owner/feedback'
      return null
    default:
      return null
  }
}

export default function NotificationBell() {
  const { t } = useTranslation('common')
  const tr = t as Translate
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [latestId, setLatestId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(open)
  const lastToastTimeRef = useRef(0)
  const panelTitleId = useId()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    openRef.current = open
  }, [open])

  const roles = user?.roles
  const countLabel = useMemo(() => (unreadCount > 99 ? '99+' : String(unreadCount)), [unreadCount])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([])
      setUnreadCount(0)
      setLatestId(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(false)

    Promise.all([
      notificationService.list({ page: 1, pageSize: 20, status: 'all' }),
      notificationService.unreadCount(),
    ])
      .then(([list, count]) => {
        if (cancelled) return
        setNotifications(list.data)
        setUnreadCount(count)
        setLatestId(list.data[0]?.notificationId ?? '0')
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.userId, user])

  useEffect(() => {
    if (!isAuthenticated || !user || latestId === null) return

    let cancelled = false
    const baselineId = latestId

    async function poll() {
      if (document.visibilityState === 'hidden') return
      try {
        const items = await notificationService.listNew(baselineId, 20)
        if (cancelled || items.length === 0) return

        const sorted = [...items].sort((a, b) => toNumberId(a.notificationId) - toNumberId(b.notificationId))
        const newest = sorted[sorted.length - 1]

        // Chỉ hiển thị toast khi panel không mở và thỏa mãn cooldown
        if (!openRef.current) {
          const now = Date.now()
          if (now - lastToastTimeRef.current >= TOAST_COOLDOWN_MS) {
            lastToastTimeRef.current = now
            const message =
              items.length === 1
                ? translateNotification(newest, tr).title
                : tr('notification.toastMany', { count: items.length })
            showRealtimeNotificationToast(message)
          }
        }

        setLatestId(newest.notificationId)
        setNotifications((current) => mergeNotifications(current, sorted))

        if (openRef.current) {
          // Bảng thông báo đang mở: tự động đánh dấu đã đọc
          setUnreadCount(0)
          void notificationService.markAllRead().catch(() => {})
        } else {
          const count = await notificationService.unreadCount()
          if (!cancelled) setUnreadCount(count)
        }
      } catch {
        // Polling should stay quiet; the popover shows the last loaded state.
      }
    }

    const interval = setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isAuthenticated, latestId, tr, user])

  async function handleToggle() {
    const nextOpen = !open
    setOpen(nextOpen)

    if (nextOpen) {
      // Khi mở bảng thông báo: Tự động đánh dấu tất cả là đã đọc và xóa badge đỏ
      if (unreadCount > 0) {
        setUnreadCount(0)
        setNotifications((current) =>
          current.map((item) => ({
            ...item,
            unread: false,
            readAt: item.readAt ?? new Date().toISOString(),
          }))
        )
        void notificationService.markAllRead().catch(() => {})
      }

      if (notifications.length === 0 && !loading) {
        setLoading(true)
        try {
          const list = await notificationService.list({ page: 1, pageSize: 20, status: 'all' })
          setNotifications(
            list.data.map((item) => ({
              ...item,
              unread: false,
              readAt: item.readAt ?? new Date().toISOString(),
            }))
          )
        } catch {
          setError(true)
        } finally {
          setLoading(false)
        }
      }
    }
  }

  async function handleReadAll() {
    await notificationService.markAllRead()
    setUnreadCount(0)
    setNotifications((current) => current.map((item) => ({ ...item, unread: false, readAt: item.readAt ?? new Date().toISOString() })))
  }

  async function handleNotificationClick(item: NotificationItem) {
    if (item.unread) {
      await notificationService.markRead(item.notificationId)
      setUnreadCount((count) => Math.max(0, count - 1))
      setNotifications((current) =>
        current.map((candidate) =>
          candidate.notificationId === item.notificationId
            ? { ...candidate, unread: false, readAt: new Date().toISOString() }
            : candidate
        )
      )
    }

    setOpen(false)
    const path = getNotificationPath(item, roles, pathname)
    if (path) navigate(path)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`rogym-btn--icon rogym-btn--elevated rogym-topbar__notification relative ${open ? 'text-[var(--rogym-teal)]' : ''}`}
        aria-label={tr('notification.ariaLabel')}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#ff5a5f] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {countLabel}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel titleId={panelTitleId}>
          <div className="rogym-notification-panel__header">
            <div className="rogym-notification-panel__header-copy">
              <div id={panelTitleId} className="rogym-notification-panel__title">{tr('notification.title')}</div>
              <div className="rogym-notification-panel__meta">
                {unreadCount > 0 ? tr('notification.unread', { count: unreadCount }) : tr('notification.allRead')}
              </div>
            </div>
            <button
              type="button"
              onClick={handleReadAll}
              disabled={unreadCount === 0}
              className="rogym-notification-panel__mark-all"
              aria-label={tr('notification.markAllRead')}
            >
              <CheckCheck size={16} />
            </button>
          </div>

          <div className="rogym-notification-panel__list">
            {loading && (
              <div className="rogym-notification-panel__state">
                <Loader2 size={16} className="animate-spin" />
                {tr('notification.loading')}
              </div>
            )}

            {!loading && error && <div className="rogym-notification-panel__state is-error">{tr('notification.loadError')}</div>}

            {!loading && !error && notifications.length === 0 && (
              <div className="rogym-notification-panel__state">{tr('notification.empty')}</div>
            )}

            {!loading &&
              !error &&
              notifications.map((item) => {
                const notificationText = translateNotification(item, tr)
                return (
                  <button
                    key={item.notificationId}
                    type="button"
                    onClick={() => void handleNotificationClick(item)}
                    className={`rogym-notification-panel__item ${item.unread ? 'is-unread' : ''}`}
                  >
                    <div className="rogym-notification-panel__item-layout">
                      <span className={`rogym-notification-panel__dot ${item.unread ? 'is-unread' : ''}`} />
                      <span className="rogym-notification-panel__item-copy">
                        <span className="rogym-notification-panel__item-title">{notificationText.title}</span>
                        <span className="rogym-notification-panel__item-message">{notificationText.message}</span>
                        <span className="rogym-notification-panel__item-time">{relativeTime(item.createdAt, tr)}</span>
                      </span>
                    </div>
                  </button>
                )
              })}
          </div>
        </NotificationPanel>
      )}
    </div>
  )
}
