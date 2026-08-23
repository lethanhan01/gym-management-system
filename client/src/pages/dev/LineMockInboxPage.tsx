import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  Award,
  Bot,
  Calendar,
  CalendarPlus,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Copy,
  CreditCard,
  Dumbbell,
  ExternalLink,
  Flame,
  Globe,
  HelpCircle,
  Hourglass,
  Image as ImageIcon,
  Keyboard,
  List,
  Menu,
  MessageSquare,
  Mic,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Smile,
  Sparkles,
  User,
  UserPlus,
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
  | 'pt-booking-updated'
  | 'pt-booking-cancelled'
  | 'pt-session-cancelled'
  | 'pt-reminder-30m'
  | 'pt-session-starting'
  | 'pt-training-completed'
  | 'attendance-checkin'
  | 'subscription-expiring'
  | 'payment-success'
  | 'feedback-responded'
  | 'welcome'
  | 'help'

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

function FlexComponent({
  component,
  onSelectUrl,
}: {
  component: JsonRecord
  onSelectUrl?: (url: string, label?: string) => void
}) {
  const type = stringValue(component.type)

  if (type === 'text') {
    const text = stringValue(component.text) ?? ''
    const size = stringValue(component.size)
    const color = stringValue(component.color)
    const weight = stringValue(component.weight)
    const flex = typeof component.flex === 'number' ? component.flex : undefined
    const wrap = component.wrap !== false
    const align = stringValue(component.align)

    const sizeClass =
      size === 'xxs'
        ? 'text-[10px]'
        : size === 'xs'
        ? 'text-[11px]'
        : size === 'sm'
        ? 'text-xs sm:text-sm'
        : size === 'md'
        ? 'text-sm'
        : size === 'lg'
        ? 'text-base font-semibold'
        : size === 'xl'
        ? 'text-lg font-bold'
        : size === 'xxl'
        ? 'text-xl font-bold'
        : 'text-xs sm:text-sm'

    return (
      <p
        className={`${wrap ? 'whitespace-pre-wrap break-words' : 'truncate'} ${
          weight === 'bold' ? 'font-bold' : 'font-normal'
        } ${sizeClass} ${align === 'center' ? 'text-center' : align === 'end' ? 'text-right' : ''}`}
        style={{
          color: color || undefined,
          flex: flex !== undefined ? `${flex} ${flex} 0%` : undefined,
        }}
      >
        {text}
      </p>
    )
  }

  if (type === 'box') {
    const layout = stringValue(component.layout) ?? 'vertical'
    const horizontal = layout === 'horizontal' || layout === 'baseline'
    const bg = stringValue(component.backgroundColor)
    const cornerRadius = stringValue(component.cornerRadius)
    const flex = typeof component.flex === 'number' ? component.flex : undefined
    const alignItems = stringValue(component.alignItems)
    const justifyContent = stringValue(component.justifyContent)
    const spacing = stringValue(component.spacing)
    const margin = stringValue(component.margin)

    const gapClass =
      spacing === 'xs'
        ? 'gap-1'
        : spacing === 'sm'
        ? 'gap-1.5'
        : spacing === 'md'
        ? 'gap-2.5'
        : spacing === 'lg'
        ? 'gap-3.5'
        : spacing === 'xl'
        ? 'gap-4'
        : horizontal
        ? 'gap-2'
        : 'gap-1.5'

    const marginClass =
      margin === 'xs'
        ? 'mt-1'
        : margin === 'sm'
        ? 'mt-1.5'
        : margin === 'md'
        ? 'mt-2.5'
        : margin === 'lg'
        ? 'mt-3.5'
        : ''

    const roundedClass =
      cornerRadius === 'xxl' || cornerRadius === 'xl'
        ? 'rounded-full'
        : cornerRadius === 'md' || cornerRadius === 'lg'
        ? 'rounded-lg'
        : cornerRadius === 'sm'
        ? 'rounded-md'
        : ''

    const alignClass =
      alignItems === 'center'
        ? 'items-center'
        : alignItems === 'flex-start'
        ? 'items-start'
        : alignItems === 'flex-end'
        ? 'items-end'
        : ''

    const justifyClass =
      justifyContent === 'space-between'
        ? 'justify-between'
        : justifyContent === 'center'
        ? 'justify-center'
        : justifyContent === 'flex-end'
        ? 'justify-end'
        : ''

    return (
      <div
        className={`flex ${horizontal ? 'flex-row' : 'flex-col'} ${gapClass} ${marginClass} ${roundedClass} ${alignClass} ${justifyClass}`}
        style={{
          backgroundColor: bg || undefined,
          flex: flex !== undefined ? `${flex} ${flex} 0%` : undefined,
          paddingTop: stringValue(component.paddingTop),
          paddingBottom: stringValue(component.paddingBottom),
          paddingLeft: stringValue(component.paddingStart) || stringValue(component.paddingAll),
          paddingRight: stringValue(component.paddingEnd) || stringValue(component.paddingAll),
        }}
      >
        {recordList(component.contents).map((child, index) => (
          <FlexComponent
            key={`${stringValue(child.type) ?? 'component'}-${index}`}
            component={child}
            onSelectUrl={onSelectUrl}
          />
        ))}
      </div>
    )
  }

  if (type === 'button') {
    const action = isRecord(component.action) ? component.action : undefined
    const label = stringValue(action?.label) ?? 'Action'
    const uri = stringValue(action?.uri) ?? ''
    const style = stringValue(component.style) ?? 'primary'

    return (
      <button
        type="button"
        onClick={() => {
          if (uri && onSelectUrl) {
            onSelectUrl(uri, label)
          }
        }}
        className={`w-full rounded-xl py-2.5 px-3 text-center text-xs sm:text-sm font-extrabold transition-all active:scale-[0.98] cursor-pointer shadow-md ${
          style === 'primary'
            ? 'bg-[#06c384] text-[#00492f] hover:bg-[#08d891] hover:shadow-emerald-500/20'
            : 'border border-[#42e09e]/50 bg-[#42e09e]/10 text-[#42e09e] hover:bg-[#42e09e]/20'
        }`}
      >
        {label}
      </button>
    )
  }

  if (type === 'separator') {
    const color = stringValue(component.color) || '#1a2520'
    const margin = stringValue(component.margin)
    const marginClass =
      margin === 'md' ? 'my-2.5' : margin === 'lg' ? 'my-3.5' : 'my-2'
    return <hr className={`w-full border-t ${marginClass}`} style={{ borderColor: color }} />
  }

  if (type === 'image') {
    const url = stringValue(component.url)
    return url ? (
      <img
        className="max-h-48 w-full rounded-xl object-cover"
        src={url}
        alt={stringValue(component.altText) ?? ''}
      />
    ) : null
  }

  if (type === 'spacer') return <div className="h-2" />

  return (
    <p className="rounded bg-white/10 px-2 py-1 text-xs text-white/60">
      Component Flex chưa hỗ trợ: {type ?? 'unknown'}
    </p>
  )
}

function FlexPreview({
  contents,
  onSelectUrl,
}: {
  contents: unknown
  onSelectUrl?: (url: string, label?: string) => void
}) {
  const root = isRecord(contents) ? contents : undefined
  if (!root)
    return <p className="text-sm text-white/60">Flex payload không có nội dung hợp lệ.</p>

  const renderBubble = (bubble: JsonRecord, index: number) => {
    const styles = isRecord(bubble.styles) ? bubble.styles : undefined
    const headerBg = isRecord(styles?.header) ? stringValue(styles?.header.backgroundColor) : '#0f1c16'
    const bodyBg = isRecord(styles?.body) ? stringValue(styles?.body.backgroundColor) : '#0f1c16'
    const footerBg = isRecord(styles?.footer) ? stringValue(styles?.footer.backgroundColor) : '#0f1c16'

    return (
      <div
        key={index}
        className="min-w-[17rem] max-w-sm overflow-hidden rounded-2xl border border-[#1a2520] bg-[#0f1c16] shadow-xl ring-1 ring-white/5"
      >
        {/* Header section */}
        {isRecord(bubble.header) && (
          <div className="border-b border-[#1a2520] px-4 py-3" style={{ backgroundColor: headerBg }}>
            <FlexComponent component={bubble.header} onSelectUrl={onSelectUrl} />
          </div>
        )}

        {/* Hero section */}
        {isRecord(bubble.hero) && (
          <div className="overflow-hidden">
            <FlexComponent component={bubble.hero} onSelectUrl={onSelectUrl} />
          </div>
        )}

        {/* Body section */}
        {isRecord(bubble.body) && (
          <div className="p-4" style={{ backgroundColor: bodyBg }}>
            <FlexComponent component={bubble.body} onSelectUrl={onSelectUrl} />
          </div>
        )}

        {/* Footer section */}
        {isRecord(bubble.footer) && (
          <div className="border-t border-[#1a2520] p-3" style={{ backgroundColor: footerBg }}>
            <FlexComponent component={bubble.footer} onSelectUrl={onSelectUrl} />
          </div>
        )}
      </div>
    )
  }

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
              <FlexPreview contents={message.contents} onSelectUrl={onSelectUrl} />
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
  locale,
}: {
  areas: JsonRecord[]
  onSelectUrl: (url: string, label?: string, index?: number) => void
  compact?: boolean
  locale?: 'ja' | 'vi'
}) {
  const firstActionLabel =
    areas.length > 0 && isRecord(areas[0]?.action) ? stringValue(areas[0]?.action.label) : ''
  const isJa = locale === 'ja' || firstActionLabel === 'スケジュール' || (!locale && firstActionLabel !== 'Lịch tập')

  const zoneMeta = isJa
    ? [
        {
          icon: Calendar,
          title: 'スケジュール',
          subtitle: '履歴・予定確認',
          badge: 'ZONE 1',
        },
        {
          icon: CalendarPlus,
          title: 'PT予約',
          subtitle: '日時指定予約',
          badge: '今すぐ予約',
        },
        {
          icon: QrCode,
          title: 'チェックイン',
          subtitle: '会員証QR表示',
          badge: 'ZONE 3',
        },
        {
          icon: User,
          title: 'マイページ',
          subtitle: '契約・会員情報',
          badge: 'ZONE 4',
        },
      ]
    : [
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
          badge: 'HOT · Zone 2',
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
    <div
      className={`grid ${
        compact
          ? 'grid-cols-4 divide-x divide-emerald-500/20'
          : 'grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-emerald-500/20'
      } bg-black/40 overflow-hidden`}
    >
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
              compact ? 'p-1.5 sm:p-2' : 'p-4 sm:p-5'
            } text-center transition-all hover:bg-white/[0.06] active:scale-[0.98] cursor-pointer`}
          >
            {/* Zone Badge using UI Badge Component */}
            <Badge
              tone="muted"
              size="xs"
              className={`${
                compact ? 'mb-1 text-[9px] px-1 py-0' : 'mb-2 text-xs'
              } font-extrabold uppercase tracking-wider text-white/80 border-white/15 bg-white/10`}
            >
              {meta.badge}
            </Badge>

            {/* Icon Box */}
            <div
              className={`flex ${
                compact ? 'h-8 w-8' : 'h-12 w-12'
              } items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 transition-all group-hover:scale-105 group-hover:bg-emerald-500/20 group-hover:text-emerald-300`}
            >
              <IconComponent size={compact ? 16 : 22} />
            </div>

            {/* Title */}
            <p
              className={`mt-1.5 ${
                compact ? 'text-[11px]' : 'text-xs sm:text-sm'
              } font-bold tracking-tight text-white group-hover:text-[var(--rogym-accent)] line-clamp-1`}
            >
              {label}
            </p>

            {/* Subtitle / Hint */}
            {!compact && <p className="mt-0.5 text-[11px] text-white/50">{meta.subtitle}</p>}

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
  name: 'RoGym Member Menu (JA)',
  chatBarText: 'RoGymメニュー',
  areas: [
    {
      bounds: { x: 0, y: 0, width: 625, height: 843 },
      action: {
        type: 'uri',
        label: 'スケジュール',
        uri: '/liff?redirect=/member/workout/sessions',
      },
    },
    {
      bounds: { x: 625, y: 0, width: 625, height: 843 },
      action: {
        type: 'uri',
        label: 'PT予約',
        uri: `/liff?redirect=${encodeURIComponent('/member/workout/sessions?book=1')}`,
      },
    },
    {
      bounds: { x: 1250, y: 0, width: 625, height: 843 },
      action: {
        type: 'uri',
        label: 'チェックイン',
        uri: '/liff?redirect=/member/check-in',
      },
    },
    {
      bounds: { x: 1875, y: 0, width: 625, height: 843 },
      action: {
        type: 'uri',
        label: 'マイページ',
        uri: '/liff?redirect=/member/profile',
      },
    },
  ],
}

function formatLineDateBadge(isoString?: string): string {
  if (!isoString) return 'Th 7, 18 thg 7'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return 'Th 7, 18 thg 7'
  const days = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7']
  const dayName = days[date.getDay()]
  const dayNum = date.getDate()
  const monthNum = date.getMonth() + 1
  return `${dayName}, ${dayNum} thg ${monthNum}`
}

function LineMobileChatMessageBubble({
  payload,
  timestamp,
  onSelectUrl,
}: {
  payload: JsonRecord
  timestamp: string
  onSelectUrl: (url: string) => void
}) {
  const messages = recordList(payload.messages)
  const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (messages.length === 0) return null

  return (
    <div className="flex items-start gap-2 max-w-[92%]">
      {/* Bot Circular Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white font-extrabold shadow border border-emerald-400/30">
        <Dumbbell size={16} />
      </div>

      <div className="flex flex-col gap-2 min-w-0 flex-1">
        {messages.map((message, index) => {
          if (message.type === 'text') {
            const rawText = stringValue(message.text) ?? ''
            const quickReply = isRecord(message.quickReply)
              ? recordList(message.quickReply.items)
              : []
            const hasLiffUrl =
              rawText.includes('http') || rawText.includes('liff') || rawText.includes('/liff')

            return (
              <div key={index} className="flex items-end gap-1.5 min-w-0">
                {/* Bubble Container */}
                <div className="rounded-2xl rounded-tl-xs bg-[#262626] px-3.5 py-2.5 text-xs sm:text-sm text-white leading-relaxed shadow-md border border-white/5 max-w-[82%] break-words">
                  <p className="whitespace-pre-wrap font-normal text-white/90">
                    {rawText}
                  </p>

                  {/* LIFF Link Preview Card if message contains LIFF link */}
                  {hasLiffUrl && (
                    <div
                      onClick={() => onSelectUrl('/liff?redirect=/member/profile')}
                      className="mt-2.5 cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#1d1d1d] p-2.5 transition-all hover:bg-[#222]"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <span>Gym Management</span>
                        <ExternalLink size={12} className="text-blue-400" />
                      </div>
                      <p className="mt-1 text-[11px] text-white/60">
                        Chạm vào đây để mở liên kết này.
                      </p>
                    </div>
                  )}

                  {quickReply.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                      <QuickReply items={quickReply} onSelectUrl={onSelectUrl} />
                    </div>
                  )}
                </div>

                {/* Timestamp outside bottom right of bubble */}
                <span className="text-[10px] text-white/40 font-medium shrink-0 self-end mb-0.5">
                  {timeStr}
                </span>
              </div>
            )
          }

          if (message.type === 'flex') {
            return (
              <div key={index} className="flex items-end gap-1.5 min-w-0">
                <div>
                  <p className="mb-1 text-[10px] text-white/50">
                    {stringValue(message.altText) ?? 'Flex Message'}
                  </p>
                  <FlexPreview contents={message.contents} onSelectUrl={onSelectUrl} />
                </div>
                <span className="text-[10px] text-white/40 font-medium shrink-0 self-end mb-0.5">
                  {timeStr}
                </span>
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
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
    chatEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
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

  function handleTapCTA(url: string, label?: string) {
    const tapEvent: ChatRoomEvent = {
      id: `cta-${Date.now()}`,
      type: 'system-tap',
      timestamp: new Date().toISOString(),
      tapDetails: { label: label ? `CTA: ${label}` : 'Flex CTA', uri: url, zoneIndex: 0 },
    }
    setUserEvents((prev) => [...prev, tapEvent])
    onSelectUrl(url)
  }

  const richMenuMsg = messages.find((m) => m.kind === 'rich-menu')
  const richMenuPayload = (richMenuMsg?.payload as JsonRecord) || DEFAULT_RICH_MENU_PAYLOAD
  const areas = recordList(richMenuPayload.areas)

  return (
    <div className="flex flex-col items-center">
      {/* Smartphone Device Frame for LINE Chat Room */}
      <div className="relative w-[360px] sm:w-[380px] rounded-[48px] border-4 border-[#334155] bg-[#090d16] p-3 shadow-2xl ring-1 ring-white/20">
        {/* Dynamic Island / Speaker Pill */}
        <div className="absolute left-1/2 top-4 -translate-x-1/2 z-20 flex h-5 w-24 items-center justify-center rounded-full bg-black">
          <div className="h-2.5 w-2.5 rounded-full bg-[#1e293b] ring-1 ring-white/10" />
          <div className="ml-2 h-1.5 w-1.5 rounded-full bg-[#0ea5e9]/40" />
        </div>

        {/* Screen Bezel Container */}
        <div className="relative flex flex-col h-[660px] w-full overflow-hidden rounded-[36px] bg-[#191919]">
          {/* Status Bar */}
          <div className="z-10 flex items-center justify-between bg-[#111111] px-5 pt-3 pb-1 text-[10px] text-white/70 font-semibold border-b border-white/5">
            <span>4:37</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1 rounded bg-white/10">VoLTE</span>
              <span>4G</span>
              <span className="inline-block h-2 w-3.5 rounded-sm border border-white/60 bg-white/40" />
            </div>
          </div>

          {/* LINE Chat Room Header (Matching Screenshot) */}
          <div className="z-10 flex items-center justify-between border-b border-white/10 bg-[#161616] px-3.5 py-2.5 shadow-md">
            <div className="flex items-center gap-2 min-w-0">
              <button type="button" className="text-white hover:opacity-70 p-0.5">
                <ChevronLeft size={22} />
              </button>
              <div className="min-w-0 leading-tight">
                <h3 className="text-sm font-extrabold text-white tracking-wide truncate uppercase">ROGYM</h3>
                <p className="text-[10px] text-[#4183d7] font-semibold truncate">
                  Phản hồi từ nhà cung cấp
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-white">
              <button type="button" title="Tìm kiếm" className="hover:opacity-70 p-1">
                <Search size={18} />
              </button>
              <button type="button" title="Menu" className="hover:opacity-70 p-1">
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* Chat Messages Timeline Stream */}
          <div className="relative flex-1 overflow-y-auto p-3 space-y-3 bg-[#191919] scrollbar-thin scrollbar-thumb-white/10">
            {/* Centered Date Badge */}
            <div className="my-1.5 flex justify-center">
              <span className="rounded-full bg-[#262626] px-3.5 py-0.5 text-[10px] font-semibold text-white/70 shadow-sm border border-white/5">
                {formatLineDateBadge(allEvents[0]?.timestamp)}
              </span>
            </div>

            {allEvents.length === 0 ? (
              <div className="py-12 text-center text-[11px] text-white/40 italic">
                Chưa có tin nhắn trong khung chat. Bấm các nút mẫu tin nhắn ở trên để thử nghiệm.
              </div>
            ) : (
              allEvents.map((evt) => {
                if (evt.type === 'server-msg' && evt.mockMessage) {
                  return (
                    <LineMobileChatMessageBubble
                      key={evt.id}
                      payload={evt.mockMessage.payload}
                      timestamp={evt.timestamp}
                      onSelectUrl={handleTapCTA}
                    />
                  )
                }

                if (evt.type === 'user-msg') {
                  const timeStr = new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={evt.id} className="flex justify-end items-end gap-1.5">
                      <span className="text-[10px] text-white/40 font-medium shrink-0 self-end mb-0.5">
                        {timeStr}
                      </span>
                      <div className="max-w-[82%] rounded-2xl rounded-tr-xs bg-[#06C755] px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white shadow-md">
                        {evt.userText}
                      </div>
                    </div>
                  )
                }

                if (evt.type === 'system-tap' && evt.tapDetails) {
                  return (
                    <div key={evt.id} className="my-1.5 flex justify-center">
                      <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 shadow-sm">
                        <Sparkles size={11} />
                        <span>
                          {evt.tapDetails.zoneIndex > 0 ? `[Zone ${evt.tapDetails.zoneIndex}] ` : ''}
                          {evt.tapDetails.label}
                        </span>
                        <span className="text-white/40">→ Simulator</span>
                      </div>
                    </div>
                  )
                }

                return null
              })
            )}
            <div ref={chatEndRef} />

            {/* Floating Scroll Down Arrow Button */}
            <button
              type="button"
              onClick={() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="absolute right-3 bottom-3 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-[#262626]/90 text-white shadow-xl border border-white/10 hover:bg-[#333] transition-all active:scale-95"
              title="Cuộn xuống tin nhắn mới nhất"
            >
              <ArrowDown size={14} />
            </button>
          </div>

          {/* Sticky Bottom LINE Chat Bar & Toolbar */}
          <div className="border-t border-white/10 bg-[#161616]">
            {/* Chat Bar Toggle Header Strip */}
            <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-3 py-1 text-[11px]">
              <button
                type="button"
                onClick={() => setShowRichMenu((prev) => !prev)}
                className="group flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white transition-all hover:bg-[var(--rogym-accent)] hover:text-black active:scale-95"
              >
                {showRichMenu ? (
                  <>
                    <Keyboard size={12} />
                    <span>Thu gọn menu</span>
                    <ChevronDown size={12} />
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-[var(--rogym-accent)] group-hover:text-black" />
                    <span>{stringValue(richMenuPayload.chatBarText) || 'RoGymメニュー'} (4 Vùng)</span>
                    <ChevronUp size={12} />
                  </>
                )}
              </button>

              <span className="text-[10px] font-medium text-white/50">
                {showRichMenu ? '📌 Rich Menu 4 Vùng' : '⌨ Bàn phím LINE'}
              </span>
            </div>

            {/* Content area based on showRichMenu state */}
            {showRichMenu ? (
              /* Fixed 4-Zone Rich Menu Bar */
              <div className="bg-[#0f0f0f] p-1.5">
                <div className="rounded-lg border border-white/10 overflow-hidden shadow-inner">
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
              /* Authentic LINE Toolbar Input Form */
              <form onSubmit={handleSendUserMessage} className="flex items-center gap-2 p-2.5 bg-[#161616]">
                <div className="flex items-center gap-2 text-white/70">
                  <button type="button" title="Menu" className="hover:text-white transition-colors">
                    <Plus size={18} />
                  </button>
                  <button type="button" title="Camera" className="hover:text-white transition-colors">
                    <Camera size={18} />
                  </button>
                  <button type="button" title="Bộ sưu tập" className="hover:text-white transition-colors">
                    <ImageIcon size={18} />
                  </button>
                </div>

                {/* Pill Input */}
                <div className="relative flex flex-1 items-center rounded-full border border-white/10 bg-[#262626] px-3 py-1.5">
                  <input
                    type="text"
                    placeholder="Nhập tin nhắn..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                  <button type="button" title="Biểu cảm Emoji" className="ml-1 text-white/60 hover:text-white">
                    <Smile size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {inputText.trim() ? (
                    <button
                      type="submit"
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all active:scale-95"
                    >
                      <Send size={12} />
                    </button>
                  ) : (
                    <button type="button" title="Ghi âm" className="text-white/70 hover:text-white p-1">
                      <Mic size={18} />
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Bottom Home Indicator Bar */}
            <div className="flex h-4 w-full items-center justify-center bg-[#111111]">
              <div className="h-1 w-28 rounded-full bg-white/40" />
            </div>
          </div>
        </div>
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
            <section className="rounded-2xl border border-white/10 bg-[#081814] p-5 shadow-lg space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-[var(--rogym-accent)] animate-pulse" />
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                      Mô phỏng sự kiện & Mẫu tin nhắn LINE Flex
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-white/50">
                    Bấm để tạo và gửi tin nhắn mẫu song ngữ vào Outbox / Chat Room
                  </p>
                </div>

                {/* Language Switcher */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 p-1 text-xs">
                  <Globe size={13} className="text-white/50 ml-1.5" />
                  <span className="text-white/50 text-[11px] font-medium">Ngôn ngữ:</span>
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

              {/* 4 Categorized Sample Trigger Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Group 1: PT Sessions */}
                <div className="rounded-xl border border-emerald-500/20 bg-black/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                        <Dumbbell size={13} />
                      </div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-emerald-300">
                        1. Lịch Tập PT
                      </h3>
                    </div>
                    <Badge tone="success" size="xs">6 Mẫu</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => void createSample('pt-booking-created')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2 text-left transition-all hover:bg-emerald-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-emerald-400">
                        <CalendarPlus size={12} />
                        <span className="text-[11px] font-bold">Đặt lịch mới</span>
                      </div>
                      <span className="text-[9px] text-white/50 line-clamp-1">training.created</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void createSample('pt-booking-updated')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-sky-500/25 bg-sky-500/10 p-2 text-left transition-all hover:bg-sky-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-sky-400">
                        <Calendar size={12} />
                        <span className="text-[11px] font-bold">Đổi lịch</span>
                      </div>
                      <span className="text-[9px] text-white/50 line-clamp-1">training.updated</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void createSample('pt-booking-cancelled')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 p-2 text-left transition-all hover:bg-rose-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-rose-400">
                        <X size={12} />
                        <span className="text-[11px] font-bold">Hủy lịch</span>
                      </div>
                      <span className="text-[9px] text-white/50 line-clamp-1">training.cancelled</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void createSample('pt-reminder-30m')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-left transition-all hover:bg-amber-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-amber-400">
                        <Clock size={12} />
                        <span className="text-[11px] font-bold">Nhắc 30p</span>
                      </div>
                      <span className="text-[9px] text-white/50 line-clamp-1">training.reminder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void createSample('pt-session-starting')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2 text-left transition-all hover:bg-emerald-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-emerald-400">
                        <Flame size={12} />
                        <span className="text-[11px] font-bold">Tới giờ tập</span>
                      </div>
                      <span className="text-[9px] text-white/50 line-clamp-1">training.starting</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void createSample('pt-training-completed')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-teal-500/25 bg-teal-500/10 p-2 text-left transition-all hover:bg-teal-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-teal-300">
                        <Award size={12} />
                        <span className="text-[11px] font-bold">Hoàn thành</span>
                      </div>
                      <span className="text-[9px] text-white/50 line-clamp-1">training.completed</span>
                    </button>
                  </div>
                </div>

                {/* Group 2: Attendance & Subscriptions */}
                <div className="rounded-xl border border-sky-500/20 bg-black/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                        <QrCode size={13} />
                      </div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-sky-300">
                        2. Điểm Danh & Gói Tập
                      </h3>
                    </div>
                    <Badge tone="info" size="xs">2 Mẫu</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void createSample('attendance-checkin')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-sky-500/25 bg-sky-500/10 p-2.5 text-left transition-all hover:bg-sky-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-sky-400">
                        <QrCode size={13} />
                        <span className="text-xs font-bold">Check-in QR</span>
                      </div>
                      <span className="text-[10px] text-white/50">attendance.checkin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void createSample('subscription-expiring')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2.5 text-left transition-all hover:bg-amber-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <Hourglass size={13} />
                        <span className="text-xs font-bold">Gói sắp hết hạn</span>
                      </div>
                      <span className="text-[10px] text-white/50">subscription.expiring</span>
                    </button>
                  </div>
                </div>

                {/* Group 3: Payments & Feedback */}
                <div className="rounded-xl border border-purple-500/20 bg-black/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                        <Receipt size={13} />
                      </div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-purple-300">
                        3. Thanh Toán & Góp Ý
                      </h3>
                    </div>
                    <Badge tone="purple" size="xs">2 Mẫu</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void createSample('payment-success')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-purple-500/25 bg-purple-500/10 p-2.5 text-left transition-all hover:bg-purple-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-purple-400">
                        <CreditCard size={13} />
                        <span className="text-xs font-bold">Biên lai thanh toán</span>
                      </div>
                      <span className="text-[10px] text-white/50">payment.success</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void createSample('feedback-responded')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-sky-500/25 bg-sky-500/10 p-2.5 text-left transition-all hover:bg-sky-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-sky-400">
                        <MessageSquare size={13} />
                        <span className="text-xs font-bold">Phản hồi góp ý</span>
                      </div>
                      <span className="text-[10px] text-white/50">feedback.responded</span>
                    </button>
                  </div>
                </div>

                {/* Group 4: Webhook OA & Rich Menu */}
                <div className="rounded-xl border border-amber-500/20 bg-black/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                        <Bot size={13} />
                      </div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-300">
                        4. Webhook OA & Menu
                      </h3>
                    </div>
                    <Badge tone="warning" size="xs">3 Mẫu</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => void createSample('welcome')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2 text-left transition-all hover:bg-emerald-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-emerald-400">
                        <UserPlus size={12} />
                        <span className="text-[11px] font-bold">Chào mừng</span>
                      </div>
                      <span className="text-[9px] text-white/50 line-clamp-1">webhook.follow</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void createSample('help')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-left transition-all hover:bg-amber-500/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-amber-400">
                        <HelpCircle size={12} />
                        <span className="text-[11px] font-bold">Trợ giúp</span>
                      </div>
                      <span className="text-[9px] text-white/50 line-clamp-1">webhook.help</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void createSample('rich-menu')}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-[var(--rogym-accent)]/30 bg-[var(--rogym-accent)]/10 p-2 text-left transition-all hover:bg-[var(--rogym-accent)]/20 active:scale-95 cursor-pointer"
                    >
                      <div className="flex items-center gap-1 text-[var(--rogym-accent)]">
                        <Sparkles size={12} />
                        <span className="text-[11px] font-bold">Rich Menu</span>
                      </div>
                      <span className="text-[9px] text-white/50 line-clamp-1">4 Vùng</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Webhook Events Simulator Strip */}
              <div className="border-t border-white/10 pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    Giả lập Webhook OA:
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => void simulateEvent('follow')}
                  >
                    Follow Event
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => void simulateEvent('unfollow')}
                  >
                    Unfollow Event
                  </button>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  onClick={() => void createSample('flex')}
                >
                  Mẫu Flex chuẩn (Fallback)
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
