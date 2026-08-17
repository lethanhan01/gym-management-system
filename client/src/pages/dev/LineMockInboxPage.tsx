import { useCallback, useEffect, useState } from 'react'
import api from '@/services/api'

type MockMessage = {
  id: string
  kind: 'reply' | 'push'
  createdAt: string
  recipient: string
  payload: Record<string, unknown>
  liffUrl?: string
}

type MockEvent = 'follow' | 'unfollow'

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
      setError('Không thể tải LINE Mock inbox. Hãy chắc chắn server đang chạy với LINE_MOCK_ENABLED=true.')
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

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-on-background sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Development only</p>
            <h1 className="text-2xl font-bold">LINE Mock Inbox</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Tin nhắn chỉ được giữ trong bộ nhớ của server và không gửi tới LINE.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => void refresh()} disabled={loading}>
              Làm mới
            </button>
            <button className="btn-secondary" onClick={() => void clearMessages()}>
              Xóa inbox
            </button>
          </div>
        </header>

        <section className="rounded-lg border border-outline-variant bg-surface p-4">
          <h2 className="font-semibold">Mô phỏng webhook</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Tạo event có chữ ký nội bộ, đi qua cùng luồng xử lý webhook của ứng dụng.
          </p>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" onClick={() => void simulateEvent('follow')}>
              Follow
            </button>
            <button className="btn-secondary" onClick={() => void simulateEvent('unfollow')}>
              Unfollow
            </button>
          </div>
        </section>

        {error && <p className="rounded-md bg-error-container p-3 text-sm text-on-error-container">{error}</p>}

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
              <article key={message.id} className="rounded-lg border border-outline-variant bg-surface p-4">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <strong>{message.kind === 'reply' ? 'Reply' : 'Push'} message</strong>
                  <time className="text-on-surface-variant">{new Date(message.createdAt).toLocaleString()}</time>
                </div>
                <p className="mt-2 text-sm">Đích nhận: {message.recipient}</p>
                {message.liffUrl && (
                  <a className="mt-2 inline-block text-sm text-primary underline" href={message.liffUrl}>
                    Mở LIFF link
                  </a>
                )}
                <pre className="mt-3 overflow-x-auto rounded bg-surface-variant p-3 text-xs text-on-surface-variant">
                  {JSON.stringify(message.payload, null, 2)}
                </pre>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
