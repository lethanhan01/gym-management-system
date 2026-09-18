import { lazy, Suspense } from 'react'
import type { EmojiClickData, Theme } from 'emoji-picker-react'
import { Loader2 } from 'lucide-react'

// Dynamic import bên trong sub-component để giải phóng ChatInput khỏi runtime bundle của emoji-picker-react
const EmojiPicker = lazy(() => import('emoji-picker-react'))

export interface LazyEmojiPickerProps {
  onEmojiClick: (data: EmojiClickData) => void
}

/**
 * LazyEmojiPicker: Tải động emoji-picker-react khi người dùng mở popover.
 * Chiều cao cố định 340px với Skeleton fallback giúp triệt tiêu hoàn toàn Layout Shift (CLS = 0).
 */
export function LazyEmojiPicker({ onEmojiClick }: LazyEmojiPickerProps) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Loading emoji picker"
          className="flex h-[340px] w-[280px] sm:w-[320px] items-center justify-center rounded-2xl bg-[var(--rogym-bg-card)] border border-white/10 text-white shadow-2xl"
        >
          <Loader2 className="h-6 w-6 animate-spin text-[var(--rogym-teal)]" />
        </div>
      }
    >
      <EmojiPicker
        theme={'dark' as unknown as Theme}
        onEmojiClick={onEmojiClick}
        lazyLoadEmojis
        previewConfig={{ showPreview: false }}
        height={340}
        width="100%"
        style={{ maxWidth: '320px', width: '280px' }}
      />
    </Suspense>
  )
}

export default LazyEmojiPicker
