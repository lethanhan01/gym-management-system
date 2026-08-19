import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot,
  Calendar,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Globe,
  Keyboard,
  List,
  MessageSquare,
  QrCode,
  RefreshCw,
  Send,
  Smartphone,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import api from '@/services/api'
import { Badge } from '@/components/ui/Badge'

type MockMessage = {
  id: string
  kind: 'reply' | 'push' | 'rich-menu'
  createdAt: string
  recipient?: string
  payload: Record<string, unknown>
  liffUrl?: string
}

type MockEvent = 'follow' | 'unfollow'
type MockSample =
  | 'flex'
  | 'rich-menu'
  | 'pt-booking-created'
  | 'pt-reminder-30m'
  | 'pt-session-cancelled'

type MockLocale = 'vi' | 'ja'
type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function recordList(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function normalizeSimulatorUrl(rawUrl: string): string {
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    try {
      const parsed = new URL(rawUrl)
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
      return rawUrl
    }
  }
  if (rawUrl.startsWith('liff://')) {
    const afterScheme = rawUrl.replace(/^liff:\/\/[^/]+/, '')
    return afterScheme.startsWith('/') ? afterScheme : `/${afterScheme}`
  }
  return rawUrl
}

function QuickReply({
  items,
  onSelectUrl,
}: {
  items: JsonRecord[]
  onSelectUrl: (url: string) => void
}) {
  return items.map((item, index) => {
    const action = isRecord(item.action) ? item.action : undefined
    const label = stringValue(action?.label) ?? 'Action'
    const uri = stringValue(action?.uri)
    return uri ? (
      <button
        key={`${label}-${index}`}
        type="button"
        onClick={() => onSelectUrl(uri)}
        className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--rogym-accent)] bg-[var(--rogym-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--rogym-accent)] transition-all hover:bg-[var(--rogym-accent)] hover:text-black active:scale-95"
      >
        <span>{label}</span>
        <Smartphone size={12} className="opacity-70 group-hover:opacity-100" />
      </button>
    ) : (
      <span
        key={`${label}-${index}`}
        className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/70"
      >
        {label}
      </span>
    )
  })
}

function FlexComponent({ component }: { component: JsonRecord }) {
  const type = stringValue(component.type)
  if (type === 'text') {
    const text = stringValue(component.text) ?? ''
    const size = stringValue(component.size)
    return (
      <p
        className={`whitespace-pre-wrap ${component.weight === 'bold' ? 'font-bold' : ''} ${
          size === 'xl' ? 'text-xl' : size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : ''
        }`}
        style={{ color: stringValue(component.color) }}
      >
        {text}
      </p>
    )
  }

  if (type === 'box') {
    const horizontal = component.layout === 'horizontal'
    return (
      <div className={`flex ${horizontal ? 'flex-row' : 'flex-col'} gap-3`}>
        {recordList(component.contents).map((child, index) => (
          <FlexComponent
            key={`${stringValue(child.type) ?? 'component'}-${index}`}
            component={child}
          />
        ))}
      </div>
    )
  }

  if (type === 'button') {
    const action = isRecord(component.action) ? component.action : undefined
    const label = stringValue(action?.label) ?? 'Action'
    return (
      <span
        className={`block rounded-md px-3 py-2 text-center text-sm font-semibold ${
          component.style === 'primary'
            ? 'bg-[var(--rogym-accent)] text-black'
            : 'border border-[var(--rogym-accent)] text-[var(--rogym-accent)]'
        }`}
      >
        {label}
      </span>
    )
  }

  if (type === 'image') {
    const url = stringValue(component.url)
    return url ? (
      <img
        className="max-h-48 w-full rounded object-cover"
        src={url}
        alt={stringValue(component.altText) ?? ''}
      />
    ) : null
  }

  if (type === 'separator') return <hr className="border-white/10" />
  if (type === 'spacer') return <div className="h-2" />

  return (
    <p className="rounded bg-white/10 px-2 py-1 text-xs text-white/60">
      Component Flex chưa hỗ trợ: {type ?? 'unknown'}
    </p>
  )
}

function FlexPreview({ contents }: { contents: unknown }) {
  const root = isRecord(contents) ? contents : undefined
  if (!root)
    return <p className="text-sm text-white/60">Flex payload không có nội dung hợp lệ.</p>

  const renderBubble = (bubble: JsonRecord, index: number) => (
    <div
      key={index}
      className="min-w-[17rem] max-w-sm rounded-xl border border-white/10 bg-[#0d1f1a] p-4 shadow-sm"
    >
      {['header', 'hero', 'body', 'footer'].map((section) => {
        const component = isRecord(bubble[section]) ? bubble[section] : undefined
        return component ? (
          <div
            key={section}
            className={section === 'hero' ? 'mb-3' : section === 'footer' ? 'mt-3' : 'mb-3'}
          >
            <FlexComponent component={component} />
          </div>
        ) : null
      })}
    </div>
  )

  if (root.type === 'bubble') return <div className="max-w-sm">{renderBubble(root, 0)}</div>
  if (root.type === 'carousel') {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {recordList(root.contents).map(renderBubble)}
      </div>
    )
  }
  return (
    <p className="text-sm text-white/60">
      Flex container chưa hỗ trợ: {stringValue(root.type) ?? 'unknown'}.
    </p>
  )
}

function MessagePreview({
  payload,
  onSelectUrl,
}: {
  payload: JsonRecord
  onSelectUrl: (url: string) => void
}) {
  const messages = recordList(payload.messages)
  if (messages.length === 0)
    return <p className="text-sm text-white/60">Không có LINE message để preview.</p>

  return (
    <div className="space-y-3 rounded-xl bg-black/30 p-3.5 border border-white/5">
      {messages.map((message, index) => {
        if (message.type === 'text') {
          const quickReply = isRecord(message.quickReply)
            ? recordList(message.quickReply.items)
            : []
          return (
            <div
              key={index}
              className="max-w-lg rounded-2xl rounded-tl-sm border border-white/10 bg-[#0c241d] px-4 py-3.5 shadow-md"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <MessageSquare size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-50 font-medium">
                    {stringValue(message.text) ?? ''}
                  </p>
                  {quickReply.length > 0 && (
                    <div className="mt-3.5 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      <QuickReply items={quickReply} onSelectUrl={onSelectUrl} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }
        if (message.type === 'flex') {
          return (
            <div key={index}>
              <p className="mb-2 text-xs text-white/60">
                {stringValue(message.altText) ?? 'Flex Message'}
              </p>
              <FlexPreview contents={message.contents} />
            </div>
          )
        }
        return (
          <p key={index} className="text-sm text-white/60">
            LINE message chưa hỗ trợ: {stringValue(message.type) ?? 'unknown'}.
          </p>
        )
      })}
    </div>
  )
}

function InteractiveRichMenuGrid({
  areas,
  onSelectUrl,
  compact = false,
}: {
  areas: JsonRecord[]
  onSelectUrl: (url: string, label?: string, index?: number) => void
  compact?: boolean
}) {
  const zoneMeta = [
    {
      icon: Calendar,
      title: 'LỊCH TẬP',
      subtitle: 'Xem & theo dõi',
      badge: 'ZONE 1',
    },
    {
      icon: CalendarPlus,
      title: 'ĐẶT LỊCH PT',
      subtitle: 'Xác nhận ngay',
      badge: 'ZONE 2',
    },
    {
      icon: QrCode,
      title: 'CHECK-IN',
      subtitle: 'Quét mã vào cổng',
      badge: 'ZONE 3',
    },
    {
      icon: User,
      title: 'HỒ SƠ',
      subtitle: 'Gói tập & PT',
      badge: 'ZONE 4',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-emerald-500/20 bg-black/40 overflow-hidden">
      {areas.map((area, index) => {
        const action = isRecord(area.action) ? area.action : undefined
        const uri = stringValue(action?.uri) ?? ''
        const label = stringValue(action?.label) ?? `Zone ${index + 1}`
        const meta = zoneMeta[index] ?? {
          icon: Sparkles,
          title: label,
          subtitle: 'Mở liên kết',
          badge: `ZONE ${index + 1}`,
        }
        const IconComponent = meta.icon

        return (
          <button
            key={index}
            type="button"
            onClick={() => uri && onSelectUrl(uri, label, index + 1)}
            className={`group relative flex flex-col items-center justify-center ${
              compact ? 'p-3' : 'p-4 sm:p-5'
            } text-center transition-all hover:bg-white/[0.06] active:scale-[0.98] cursor-pointer`}
          >
            {/* Zone Badge using UI Badge Component */}
            <Badge
              tone="muted"
              size="xs"
              className="mb-2 font-extrabold uppercase tracking-wider text-white/80 border-white/15 bg-white/10"
            >
              {meta.badge}
            </Badge>

            {/* Icon Box */}
            <div
              className={`flex ${
                compact ? 'h-10 w-10' : 'h-12 w-12'
              } items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 transition-all group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:text-emerald-300`}
            >
              <IconComponent size={compact ? 20 : 22} />
            </div>

            {/* Title */}
            <p className="mt-2 text-xs sm:text-sm font-bold tracking-wide text-white group-hover:text-[var(--rogym-accent)]">
              {label}
            </p>

            {/* Subtitle / Hint */}
            <p className="mt-0.5 text-[11px] text-white/50">{meta.subtitle}</p>

            {!compact && (
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[var(--rogym-accent)] opacity-0 transition-opacity group-hover:opacity-100">
                <span>Mở mô phỏng</span> →
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function RichMenuPreview({
  payload,
  onSelectUrl,
}: {
  payload: JsonRecord
  onSelectUrl: (url: string) => void
}) {
  const areas = recordList(payload.areas)

  return (
    <div className="space-y-4">
      {/* Visual Interactive Rich Menu Mockup */}
      <div className="overflow-hidden rounded-2xl border-2 border-[var(--rogym-border-teal-dim)] bg-[#051612] shadow-xl">
        {/* Rich Menu Header Banner */}
        <div className="flex items-center justify-between border-b border-emerald-500/20 bg-gradient-to-r from-[#07241c] via-[#0b362a] to-[#07241c] px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-widest text-[var(--rogym-accent)]">ROGYM OFFICIAL</span>
            <Badge tone="success" size="xs">
              2500 × 843 px
            </Badge>
          </div>
          <span className="text-[11px] text-white/50">Click vào vùng bất kỳ để test trên Simulator</span>
        </div>

        {/* Reusable 4 Interactive Tap Zones Grid */}
        <InteractiveRichMenuGrid areas={areas} onSelectUrl={(url) => onSelectUrl(url)} />
      </div>

      {/* Target URLs Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/10 bg-white/5 text-white/70">
            <tr>
              <th className="p-2.5 font-semibold">Vùng chạm (Tap Zone)</th>
              <th className="p-2.5 font-semibold">Canonical URI Action</th>
              <th className="p-2.5 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/80">
            {areas.map((area, index) => {
              const action = isRecord(area.action) ? area.action : undefined
              const uri = stringValue(action?.uri) ?? '—'
              const label = stringValue(action?.label) ?? `Zone ${index + 1}`
              return (
                <tr key={index} className="transition-colors hover:bg-white/[0.02]">
                  <td className="p-2.5 font-bold text-white">
                    {index + 1}. {label}
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-emerald-400 break-all">{uri}</td>
                  <td className="p-2.5 text-right whitespace-nowrap">
                    {uri !== '—' && (
                      <button
                        type="button"
                        onClick={() => onSelectUrl(uri)}
                        className="inline-flex items-center gap-1 rounded-md bg-[var(--rogym-accent)]/15 px-2 py-1 font-semibold text-[var(--rogym-accent)] transition-colors hover:bg-[var(--rogym-accent)] hover:text-black"
                      >
                        <Smartphone size={12} />
                        <span>Mô phỏng</span>
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MobilePhoneSimulator({
  url,
  onClose,
}: {
  url: string
  onClose: () => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [copied, setCopied] = useState(false)
  const [key, setKey] = useState(0)

  const normalizedUrl = normalizeSimulatorUrl(url)

  function handleReload() {
    setKey((prev) => prev + 1)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }

  function handleOpenNewTab() {
    window.open(normalizedUrl, '_blank')
  }

  return (
    <div className="sticky top-6 flex flex-col items-center">
      {/* Smartphone Device Frame */}
      <div className="relative w-[360px] sm:w-[380px] rounded-[48px] border-4 border-[#334155] bg-[#090d16] p-3 shadow-2xl ring-1 ring-white/20">
        {/* Dynamic Island / Speaker Pill */}
        <div className="absolute left-1/2 top-4 -translate-x-1/2 z-20 flex h-5 w-24 items-center justify-center rounded-full bg-black">
          <div className="h-2.5 w-2.5 rounded-full bg-[#1e293b] ring-1 ring-white/10" />
          <div className="ml-2 h-1.5 w-1.5 rounded-full bg-[#0ea5e9]/40" />
        </div>

        {/* Screen Bezel Container */}
        <div className="relative flex flex-col h-[650px] w-full overflow-hidden rounded-[36px] bg-[#020806]">
          {/* Simulator Status Bar & Address Bar */}
          <div className="z-10 flex flex-col border-b border-white/10 bg-[#081814] px-3 pt-6 pb-2">
            {/* Status indicators */}
            <div className="flex items-center justify-between text-[10px] text-white/60 font-semibold px-2 mb-1.5">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <span>5G</span>
                <span className="inline-block h-2 w-3.5 rounded-sm border border-white/60 bg-white/40" />
              </div>
            </div>

            {/* Address Bar */}
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-2.5 py-1 text-xs text-white">
              <span className="shrink-0 text-[10px] font-bold text-[var(--rogym-accent)]">LIFF</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/80">
                {normalizedUrl}
              </span>
              <button
                type="button"
                onClick={handleReload}
                title="Tải lại trang"
                className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <RefreshCw size={12} />
              </button>
              <button
                type="button"
                onClick={() => void handleCopy()}
                title="Sao chép liên kết"
                className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
              <button
                type="button"
                onClick={handleOpenNewTab}
                title="Mở trong tab mới"
                className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <ExternalLink size={12} />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Đóng simulator"
                className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-red-400"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Embedded Webview (iframe) */}
          <div className="relative flex-1 w-full bg-[#05130f]">
            <iframe
              key={key}
              ref={iframeRef}
              src={normalizedUrl}
              title="LIFF Mobile Preview"
              className="h-full w-full border-0 bg-[#05130f]"
              allow="clipboard-read; clipboard-write; camera"
            />
          </div>

          {/* Bottom Home Indicator Bar */}
          <div className="flex h-5 w-full items-center justify-center bg-[#081814]">
            <div className="h-1 w-28 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </div>
  )
}

type ChatRoomEvent = {
  id: string
  type: 'server-msg' | 'user-msg' | 'system-tap'
  timestamp: string
  mockMessage?: MockMessage
  userText?: string
  tapDetails?: { label: string; uri: string; zoneIndex: number }
}

const DEFAULT_RICH_MENU_PAYLOAD: JsonRecord = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: 'RoGym Member Menu',
  chatBarText: 'Mở menu RoGym',
  areas: [
    {
      bounds: { x: 0, y: 0, width: 625, height: 843 },
      action: {
        type: 'uri',
        label: 'Lịch tập',
        uri: '/liff?redirect=/member/workout/sessions',
      },
    },
    {
      bounds: { x: 625, y: 0, width: 625, height: 843 },
      action: {
        type: 'uri',
        label: 'Đặt lịch',
        uri: `/liff?redirect=${encodeURIComponent('/member/workout/sessions?book=1')}`,
      },
    },
    {
      bounds: { x: 1250, y: 0, width: 625, height: 843 },
      action: {
        type: 'uri',
        label: 'Check-in',
        uri: '/liff?redirect=/member/check-in',
      },
    },
    {
      bounds: { x: 1875, y: 0, width: 625, height: 843 },
      action: {
        type: 'uri',
        label: 'Hồ sơ',
        uri: '/liff?redirect=/member/profile',
      },
    },
  ],
}

function LineChatRoomSimulator({
  messages,
  onSelectUrl,
}: {
  messages: MockMessage[]
  onSelectUrl: (url: string) => void
}) {
  const [showRichMenu, setShowRichMenu] = useState(true)
  const [inputText, setInputText] = useState('')
  const [userEvents, setUserEvents] = useState<ChatRoomEvent[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Merge server messages & user events chronologically
  const serverEvents: ChatRoomEvent[] = messages
    .filter((m) => m.kind !== 'rich-menu')
    .map((m) => ({
      id: m.id,
      type: 'server-msg',
      timestamp: m.createdAt,
      mockMessage: m,
    }))

  const allEvents = [...serverEvents, ...userEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allEvents.length, showRichMenu])

  function handleSendUserMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!inputText.trim()) return

    const newEvent: ChatRoomEvent = {
      id: `user-${Date.now()}`,
      type: 'user-msg',
      timestamp: new Date().toISOString(),
      userText: inputText.trim(),
    }

    setUserEvents((prev) => [...prev, newEvent])
    setInputText('')
  }

  function handleTapZone(label: string, uri: string, zoneIndex: number) {
    const tapEvent: ChatRoomEvent = {
      id: `tap-${Date.now()}`,
      type: 'system-tap',
      timestamp: new Date().toISOString(),
      tapDetails: { label, uri, zoneIndex },
    }
    setUserEvents((prev) => [...prev, tapEvent])
    onSelectUrl(uri)
  }

  const richMenuMsg = messages.find((m) => m.kind === 'rich-menu')
  const richMenuPayload = (richMenuMsg?.payload as JsonRecord) || DEFAULT_RICH_MENU_PAYLOAD
  const areas = recordList(richMenuPayload.areas)

  return (
    <div className="flex flex-col rounded-3xl border-2 border-[var(--rogym-border-teal-dim)] bg-[#04120e] shadow-2xl overflow-hidden min-h-[620px] max-h-[780px]">
      {/* LINE Chat Room Simulator Header */}
      <div className="flex items-center justify-between border-b border-emerald-500/20 bg-gradient-to-r from-[#07241c] via-[#0b362a] to-[#07241c] px-5 py-3.5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-black font-extrabold shadow-md">
              <Bot size={22} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#07241c] bg-emerald-400 shadow-sm" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">RoGym Official</h3>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-300 border border-emerald-500/30">
                OFFICIAL ACCOUNT
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/70 font-medium">
              Khung Chat Giả Lập LINE · Persistent Rich Menu (`selected: true`)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
            Default Rich Menu: Active
          </span>
        </div>
      </div>

      {/* Chat Messages Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#030c09]/90 scrollbar-thin scrollbar-thumb-emerald-800/40">
        {/* Welcome / Header Banner */}
        <div className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-black/40 p-3 text-center text-xs text-white/60">
          <p className="font-semibold text-emerald-400">💬 LINE OA Chat Room Active</p>
          <p className="mt-1 text-[11px] text-white/50">
            Tin nhắn gửi đi trôi ở phía trên. Rich Menu 4 vùng ghim cố định ở đáy khung chat bên dưới.
          </p>
        </div>

        {allEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-white/40 italic">
            Chưa có tin nhắn trong khung chat. Bấm các nút ở trên để bắn mẫu tin nhắn Push / Flex Message.
          </div>
        ) : (
          allEvents.map((evt) => {
            if (evt.type === 'server-msg' && evt.mockMessage) {
              return (
                <div key={evt.id} className="flex flex-col items-start gap-1">
                  <span className="ml-1 text-[10px] font-semibold text-white/40">
                    RoGym Bot · {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <MessagePreview payload={evt.mockMessage.payload} onSelectUrl={onSelectUrl} />
                </div>
              )
            }

            if (evt.type === 'user-msg') {
              return (
                <div key={evt.id} className="flex flex-col items-end gap-1">
                  <span className="mr-1 text-[10px] font-semibold text-white/40">
                    Bạn · {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="max-w-md rounded-2xl rounded-tr-xs bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
                    {evt.userText}
                  </div>
                </div>
              )
            }

            if (evt.type === 'system-tap' && evt.tapDetails) {
              return (
                <div key={evt.id} className="my-2 flex justify-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300 shadow-sm">
                    <Sparkles size={12} />
                    <span>
                      [Tap Zone {evt.tapDetails.zoneIndex}] {evt.tapDetails.label}
                    </span>
                    <span className="text-white/40">→ Mở LIFF Simulator</span>
                  </div>
                </div>
              )
            }

            return null
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Sticky Bottom Chat Bar (Rich Menu vs Bàn phím) */}
      <div className="border-t-2 border-[var(--rogym-border-teal-dim)] bg-[#071d17]">
        {/* Chat Bar Toggle Header Strip */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-1.5 text-xs">
          <button
            type="button"
            onClick={() => setShowRichMenu((prev) => !prev)}
            className="group flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-bold text-white transition-all hover:bg-[var(--rogym-accent)] hover:text-black active:scale-95"
          >
            {showRichMenu ? (
              <>
                <Keyboard size={14} />
                <span>Thu gọn menu RoGym (Nhắn tin)</span>
                <ChevronDown size={14} />
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-[var(--rogym-accent)] group-hover:text-black" />
                <span>Mở menu RoGym (4 Vùng)</span>
                <ChevronUp size={14} />
              </>
            )}
          </button>

          <span className="hidden sm:inline text-[11px] font-medium text-white/50">
            {showRichMenu ? '📌 Rich Menu ghim cố định ở đáy' : '⌨ Bàn phím nhập tin nhắn User'}
          </span>
        </div>

        {/* Content area based on showRichMenu state */}
        {showRichMenu ? (
          /* Fixed 4-Zone Rich Menu Bar */
          <div className="bg-[#051612] p-2">
            <div className="rounded-xl border border-emerald-500/30 overflow-hidden shadow-inner">
              <InteractiveRichMenuGrid
                areas={areas}
                compact
                onSelectUrl={(url, label, index) => {
                  if (label && index) {
                    handleTapZone(label, url, index)
                  } else {
                    onSelectUrl(url)
                  }
                }}
              />
            </div>
          </div>
        ) : (
          /* Keyboard Input Form */
          <form onSubmit={handleSendUserMessage} className="flex items-center gap-2.5 p-3 bg-[#051410]">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Nhập tin nhắn giả lập của User..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-black/60 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 focus:border-[var(--rogym-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--rogym-accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[var(--rogym-accent)] px-4 py-2.5 text-xs font-extrabold text-black transition-all hover:bg-[var(--rogym-accent)]/90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-md"
            >
              <span>Gửi</span>
              <Send size={14} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function LineMockInboxPage() {
  const [messages, setMessages] = useState<MockMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLocale, setSelectedLocale] = useState<MockLocale>('vi')
  const [simulatorUrl, setSimulatorUrl] = useState<string>('/liff?redirect=/member/workout/sessions')
  const [simulatorOpen, setSimulatorOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'chat' | 'logs'>('chat')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<{ success: boolean; data: { messages: MockMessage[] } }>(
        '/dev/line-mock/messages'
      )
      setMessages(response.data.data.messages)
    } catch {
      setError(
        'Không thể tải LINE Mock inbox. Hãy chắc chắn server đang chạy với LINE_MOCK_ENABLED=true.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function clearMessages() {
    try {
      await api.delete('/dev/line-mock/messages')
      setMessages([])
      setError(null)
    } catch {
      setError('Không thể xóa LINE Mock inbox.')
    }
  }

  async function simulateEvent(type: MockEvent) {
    try {
      await api.post('/dev/line-mock/events', { type })
      await refresh()
    } catch {
      setError(`Không thể mô phỏng webhook ${type}.`)
    }
  }

  async function createSample(type: MockSample) {
    try {
      await api.post('/dev/line-mock/samples', { type, locale: selectedLocale })
      await refresh()
    } catch {
      setError(`Không thể tạo mẫu ${type}.`)
    }
  }

  function handleSelectUrl(url: string) {
    setSimulatorUrl(url)
    setSimulatorOpen(true)
  }

  return (
    <main className="min-h-screen bg-[#050f0c] px-4 py-8 text-white sm:px-8">
      <div
        className={`mx-auto transition-all ${
          simulatorOpen ? 'max-w-7xl' : 'max-w-5xl'
        } space-y-6`}
      >
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                Development Only
              </span>
              <span className="text-xs text-white/40">RoGym LINE Messaging & LIFF Sandbox</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
              LINE Mock Inbox & Simulator
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-white/60">
              Mô phỏng tin nhắn thông báo, Rich Menu tương tác 4 vùng và kiểm thử webview LIFF trên
              khung điện thoại.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSimulatorOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                simulatorOpen
                  ? 'border-[var(--rogym-accent)] bg-[var(--rogym-accent)] text-black shadow-lg shadow-[var(--rogym-accent)]/20'
                  : 'border-white/20 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              <Smartphone size={15} />
              <span>{simulatorOpen ? 'Đóng Simulator' : 'Mở Mobile Simulator'}</span>
            </button>
            <button
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
              onClick={() => void refresh()}
              disabled={loading}
            >
              Làm mới
            </button>
            <button
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
              onClick={() => void clearMessages()}
            >
              Xóa inbox
            </button>
          </div>
        </header>

        {/* Content Layout Grid (Inbox on left, Mobile Simulator on right when open) */}
        <div
          className={`grid gap-6 ${
            simulatorOpen ? 'lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_420px]' : 'grid-cols-1'
          }`}
        >
          {/* Main Controls & Outbox */}
          <div className="space-y-6 min-w-0">
            {/* Simulation Controls Panel */}
            <section className="rounded-2xl border border-white/10 bg-[#081814] p-5 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Mô phỏng sự kiện & Mẫu tin nhắn LINE
                </h2>

                {/* Language Switcher */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 p-1 text-xs">
                  <Globe size={13} className="text-white/50 ml-1.5" />
                  <span className="text-white/50 text-[11px]">Ngôn ngữ:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedLocale('vi')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      selectedLocale === 'vi'
                        ? 'bg-[var(--rogym-accent)] text-black shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Tiếng Việt (vi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLocale('ja')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      selectedLocale === 'ja'
                        ? 'bg-[var(--rogym-accent)] text-black shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    日本語 (ja)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  Mẫu thông báo Đặt lịch PT & Rich Menu
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 active:scale-95"
                    onClick={() => void createSample('pt-booking-created')}
                  >
                    <CalendarPlus size={14} />
                    <span>Tạo mẫu Đặt lịch PT</span>
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 active:scale-95"
                    onClick={() => void createSample('pt-reminder-30m')}
                  >
                    <Calendar size={14} />
                    <span>Tạo mẫu Nhắc lịch 30p</span>
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25 active:scale-95"
                    onClick={() => void createSample('pt-session-cancelled')}
                  >
                    <X size={14} />
                    <span>Tạo mẫu Hủy lịch</span>
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--rogym-accent)]/40 bg-[var(--rogym-accent)]/15 px-3 py-2 text-xs font-bold text-[var(--rogym-accent)] hover:bg-[var(--rogym-accent)]/25 active:scale-95"
                    onClick={() => void createSample('rich-menu')}
                  >
                    <Sparkles size={14} />
                    <span>Tạo mẫu Rich Menu</span>
                  </button>
                  <button
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
                    onClick={() => void createSample('flex')}
                  >
                    Tạo mẫu Flex
                  </button>
                </div>
              </div>

              {/* Webhook Events */}
              <div className="border-t border-white/10 pt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mr-2">
                  Webhook Event:
                </span>
                <button
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
                  onClick={() => void simulateEvent('follow')}
                >
                  Follow
                </button>
                <button
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
                  onClick={() => void simulateEvent('unfollow')}
                >
                  Unfollow
                </button>
              </div>
            </section>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/15 p-4 text-xs font-medium text-red-300">
                {error}
              </p>
            )}

            {/* View Mode Tab Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('chat')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
                    viewMode === 'chat'
                      ? 'bg-[var(--rogym-accent)] text-black shadow-lg shadow-[var(--rogym-accent)]/20'
                      : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <MessageSquare size={15} />
                  <span>💬 LINE Chat Room Simulator</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('logs')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
                    viewMode === 'logs'
                      ? 'bg-[var(--rogym-accent)] text-black shadow-lg shadow-[var(--rogym-accent)]/20'
                      : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <List size={15} />
                  <span>🛠 Admin Outbox Logs ({messages.length})</span>
                </button>
              </div>
              <span className="hidden sm:inline text-xs text-white/40">
                {viewMode === 'chat' ? 'Khung Chat Giả Lập Ứng Dụng LINE' : 'Danh sách Raw JSON Payload'}
              </span>
            </div>

            {/* Main Display: Chat Simulator vs Outbox List */}
            {viewMode === 'chat' ? (
              <LineChatRoomSimulator messages={messages} onSelectUrl={handleSelectUrl} />
            ) : (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Danh sách tin nhắn gửi đi ({messages.length})
                  </h2>
                  <span className="text-xs text-white/50">Mới nhất ở trên</span>
                </div>

                {loading ? (
                  <p className="py-8 text-center text-sm text-white/50">Đang nạp dữ liệu…</p>
                ) : messages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/50">
                    Chưa có tin nhắn mock nào trong hàng đợi. Bấm các nút ở trên để tạo mẫu thử nghiệm.
                  </div>
                ) : (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className="rounded-2xl border border-white/10 bg-[#081814] p-5 shadow-lg space-y-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              message.kind === 'rich-menu'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {message.kind === 'rich-menu'
                              ? 'Rich Menu'
                              : `${message.kind === 'reply' ? 'Reply' : 'Push'} message`}
                          </span>
                          {message.recipient && (
                            <span className="text-white/60">Đích: {message.recipient}</span>
                          )}
                        </div>
                        <time className="font-mono text-white/40">
                          {new Date(message.createdAt).toLocaleString()}
                        </time>
                      </div>

                      {/* Preview Content */}
                      <div>
                        {message.kind === 'rich-menu' ? (
                          <RichMenuPreview
                            payload={message.payload}
                            onSelectUrl={handleSelectUrl}
                          />
                        ) : (
                          <MessagePreview
                            payload={message.payload}
                            onSelectUrl={handleSelectUrl}
                          />
                        )}
                      </div>

                      {/* LIFF URL Action link */}
                      {message.liffUrl && (
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSelectUrl(message.liffUrl!)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--rogym-accent)] hover:underline"
                          >
                            <Smartphone size={13} />
                            <span>Mở trên Mobile Simulator</span>
                          </button>
                        </div>
                      )}

                      {/* Raw JSON Payload */}
                      <details className="border-t border-white/5 pt-2">
                        <summary className="cursor-pointer text-[11px] font-medium text-white/50 hover:text-white">
                          Xem chi tiết Payload JSON
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-xl border border-white/5 bg-black/50 p-3 font-mono text-[11px] text-emerald-400">
                          {JSON.stringify(message.payload, null, 2)}
                        </pre>
                      </details>
                    </article>
                  ))
                )}
              </section>
            )}
          </div>

          {/* Right Column: Mobile Simulator Component */}
          {simulatorOpen && (
            <aside className="lg:block">
              <MobilePhoneSimulator
                url={simulatorUrl}
                onClose={() => setSimulatorOpen(false)}
              />
            </aside>
          )}
        </div>
      </div>
    </main>
  )
}
