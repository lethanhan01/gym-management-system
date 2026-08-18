import { useCallback, useEffect, useState } from 'react'
import api from '@/services/api'

type MockMessage = {
  id: string
  kind: 'reply' | 'push' | 'rich-menu'
  createdAt: string
  recipient?: string
  payload: Record<string, unknown>
  liffUrl?: string
}

type MockEvent = 'follow' | 'unfollow'
type MockSample = 'flex' | 'rich-menu'
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

function QuickReply({ items }: { items: JsonRecord[] }) {
  return items.map((item, index) => {
    const action = isRecord(item.action) ? item.action : undefined
    const label = stringValue(action?.label) ?? 'Action'
    const uri = stringValue(action?.uri)
    return uri ? (
      <a
        key={`${label}-${index}`}
        className="rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary"
        href={uri}
      >
        {label}
      </a>
    ) : (
      <span
        key={`${label}-${index}`}
        className="rounded-full border border-outline-variant px-3 py-1 text-xs"
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
            ? 'bg-primary text-on-primary'
            : 'border border-primary text-primary'
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

  if (type === 'separator') return <hr className="border-outline-variant" />
  if (type === 'spacer') return <div className="h-2" />

  return (
    <p className="rounded bg-surface-variant px-2 py-1 text-xs text-on-surface-variant">
      Component Flex chưa hỗ trợ: {type ?? 'unknown'}
    </p>
  )
}

function FlexPreview({ contents }: { contents: unknown }) {
  const root = isRecord(contents) ? contents : undefined
  if (!root)
    return <p className="text-sm text-on-surface-variant">Flex payload không có nội dung hợp lệ.</p>

  const renderBubble = (bubble: JsonRecord, index: number) => (
    <div
      key={index}
      className="min-w-[17rem] max-w-sm rounded-xl bg-surface p-4 shadow-sm ring-1 ring-outline-variant"
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
    <p className="text-sm text-on-surface-variant">
      Flex container chưa hỗ trợ: {stringValue(root.type) ?? 'unknown'}.
    </p>
  )
}

function MessagePreview({ payload }: { payload: JsonRecord }) {
  const messages = recordList(payload.messages)
  if (messages.length === 0)
    return <p className="text-sm text-on-surface-variant">Không có LINE message để preview.</p>

  return (
    <div className="space-y-3 rounded-xl bg-surface-variant p-3">
      {messages.map((message, index) => {
        if (message.type === 'text') {
          const quickReply = isRecord(message.quickReply)
            ? recordList(message.quickReply.items)
            : []
          return (
            <div
              key={index}
              className="max-w-md rounded-2xl rounded-tl-sm bg-surface px-4 py-3 shadow-sm"
            >
              <p className="whitespace-pre-wrap text-sm">{stringValue(message.text) ?? ''}</p>
              {quickReply.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <QuickReply items={quickReply} />
                </div>
              )}
            </div>
          )
        }
        if (message.type === 'flex') {
          return (
            <div key={index}>
              <p className="mb-2 text-xs text-on-surface-variant">
                {stringValue(message.altText) ?? 'Flex Message'}
              </p>
              <FlexPreview contents={message.contents} />
            </div>
          )
        }
        return (
          <p key={index} className="text-sm text-on-surface-variant">
            LINE message chưa hỗ trợ: {stringValue(message.type) ?? 'unknown'}.
          </p>
        )
      })}
    </div>
  )
}

function RichMenuPreview({ payload }: { payload: JsonRecord }) {
  const areas = recordList(payload.areas)
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-outline-variant">
        <div className="flex aspect-[2500/843] items-center justify-center bg-gradient-to-br from-primary to-emerald-800 p-5 text-center text-on-primary">
          <div>
            <p className="text-xs font-semibold tracking-[0.3em]">ROGYM</p>
            <p className="mt-1 text-lg font-bold">Member Menu</p>
          </div>
        </div>
        <div className="grid grid-cols-4 bg-surface">
          {areas.map((area, index) => {
            const action = isRecord(area.action) ? area.action : undefined
            return (
              <div
                key={index}
                className="min-h-16 border-r border-outline-variant p-2 text-center last:border-r-0"
              >
                <p className="text-sm font-semibold">
                  {stringValue(action?.label) ?? `Zone ${index + 1}`}
                </p>
              </div>
            )
          })}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-outline-variant">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-variant text-on-surface-variant">
            <tr>
              <th className="p-2">Vùng nhấn</th>
              <th className="p-2">URI</th>
            </tr>
          </thead>
          <tbody>
            {areas.map((area, index) => {
              const action = isRecord(area.action) ? area.action : undefined
              return (
                <tr key={index} className="border-t border-outline-variant">
                  <td className="p-2 font-medium">
                    {stringValue(action?.label) ?? `Zone ${index + 1}`}
                  </td>
                  <td className="p-2 font-mono text-xs">{stringValue(action?.uri) ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function LineMockInboxPage() {
  const [messages, setMessages] = useState<MockMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
      await api.post('/dev/line-mock/samples', { type })
      await refresh()
    } catch {
      setError(`Không thể tạo mẫu ${type === 'flex' ? 'Flex Message' : 'Rich Menu'}.`)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-on-background sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Development only</p>
            <h1 className="text-2xl font-bold">LINE Mock Inbox</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Preview tin nhắn, Flex Message và Rich Menu được giữ trong bộ nhớ server.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => void refresh()} disabled={loading}>
              Làm mới
            </button>
            <button className="btn-secondary" onClick={() => void clearMessages()}>
              Xóa inbox
            </button>
          </div>
        </header>

        <section className="rounded-lg border border-outline-variant bg-surface p-4">
          <h2 className="font-semibold">Mô phỏng LINE</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => void simulateEvent('follow')}>
              Follow
            </button>
            <button className="btn-secondary" onClick={() => void simulateEvent('unfollow')}>
              Unfollow
            </button>
            <button className="btn-secondary" onClick={() => void createSample('flex')}>
              Tạo mẫu Flex
            </button>
            <button className="btn-secondary" onClick={() => void createSample('rich-menu')}>
              Tạo mẫu Rich Menu
            </button>
          </div>
        </section>

        {error && (
          <p className="rounded-md bg-error-container p-3 text-sm text-on-error-container">
            {error}
          </p>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold">Outbox ({messages.length})</h2>
          {loading ? (
            <p className="text-sm text-on-surface-variant">Đang tải…</p>
          ) : messages.length === 0 ? (
            <p className="rounded-lg border border-dashed border-outline-variant p-6 text-sm text-on-surface-variant">
              Chưa có tin nhắn mock.
            </p>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className="rounded-lg border border-outline-variant bg-surface p-4"
              >
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <strong>
                    {message.kind === 'rich-menu'
                      ? 'Rich Menu'
                      : `${message.kind === 'reply' ? 'Reply' : 'Push'} message`}
                  </strong>
                  <time className="text-on-surface-variant">
                    {new Date(message.createdAt).toLocaleString()}
                  </time>
                </div>
                {message.recipient && (
                  <p className="mt-2 text-sm">Đích nhận: {message.recipient}</p>
                )}
                <div className="mt-3">
                  {message.kind === 'rich-menu' ? (
                    <RichMenuPreview payload={message.payload} />
                  ) : (
                    <MessagePreview payload={message.payload} />
                  )}
                </div>
                {message.liffUrl && (
                  <a
                    className="mt-3 inline-block text-sm text-primary underline"
                    href={message.liffUrl}
                  >
                    Mở LIFF link
                  </a>
                )}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium">Payload JSON</summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-surface-variant p-3 text-xs text-on-surface-variant">
                    {JSON.stringify(message.payload, null, 2)}
                  </pre>
                </details>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
