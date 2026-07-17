import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { notificationService, type NotificationItem } from '@/services/notification.service'
import { useAuthStore, type Role } from '@/stores/authStore'

const POLL_INTERVAL_MS = 20_000

function toNumberId(id: string) {
  const parsed = Number(id)
  return Number.isFinite(parsed) ? parsed : 0
}

function relativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60_000))
  if (minutes < 1) return 'Vua xong'
  if (minutes < 60) return `${minutes} phut truoc`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} gio truoc`
  const days = Math.floor(hours / 24)
  return `${days} ngay truoc`
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
      if (effectiveRole === 'member') return '/member/workout/sessions'
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
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [latestId, setLatestId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

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
    setError(null)

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
        if (!cancelled) setError('Khong the tai thong bao')
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
        setLatestId(newest.notificationId)
        setNotifications((current) => mergeNotifications(current, sorted))
        const count = await notificationService.unreadCount()
        if (!cancelled) setUnreadCount(count)

        const message = items.length === 1 ? newest.title : `Ban co ${items.length} thong bao moi`
        setToast(message)
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => setToast(null), 4000)
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
  }, [isAuthenticated, latestId, user])

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    },
    []
  )

  async function handleToggle() {
    setOpen((value) => !value)
    if (!open && notifications.length === 0 && !loading) {
      setLoading(true)
      try {
        const list = await notificationService.list({ page: 1, pageSize: 20, status: 'all' })
        setNotifications(list.data)
      } catch {
        setError('Khong the tai thong bao')
      } finally {
        setLoading(false)
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
        className={`rogym-btn--icon rogym-btn--elevated rogym-topbar__notification relative ${open ? 'text-[#42e09e]' : ''}`}
        aria-label="Thong bao"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#ff5a5f] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {countLabel}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-[#101712] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Thong bao</div>
              <div className="text-xs text-[#9fb2a7]">{unreadCount > 0 ? `${unreadCount} chua doc` : 'Da doc tat ca'}</div>
            </div>
            <button
              type="button"
              onClick={handleReadAll}
              disabled={unreadCount === 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9fb2a7] hover:bg-white/5 hover:text-white disabled:opacity-40"
              aria-label="Danh dau tat ca da doc"
            >
              <CheckCheck size={16} />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto py-1">
            {loading && (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-[#9fb2a7]">
                <Loader2 size={16} className="animate-spin" />
                Dang tai
              </div>
            )}

            {!loading && error && <div className="px-4 py-8 text-center text-sm text-red-200">{error}</div>}

            {!loading && !error && notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-[#9fb2a7]">Chua co thong bao</div>
            )}

            {!loading &&
              !error &&
              notifications.map((item) => (
                <button
                  key={item.notificationId}
                  type="button"
                  onClick={() => void handleNotificationClick(item)}
                  className={`w-full border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-white/5 ${
                    item.unread ? 'bg-[#06c384]/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.unread ? 'bg-[#42e09e]' : 'bg-white/15'}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#b7c7bd]">{item.message}</span>
                      <span className="mt-1 block text-[11px] text-[#7d9086]">{relativeTime(item.createdAt)}</span>
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-5 top-20 z-50 max-w-xs rounded-xl border border-[#42e09e]/30 bg-[#102015] px-4 py-3 text-sm font-medium text-[#d9ffe9] shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
