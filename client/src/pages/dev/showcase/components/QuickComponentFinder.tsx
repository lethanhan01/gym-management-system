import { useState, useEffect, useRef } from 'react'
import { Search, ArrowRight, X } from 'lucide-react'
import { Badge, Input } from '@/components/ui'
import { COMPONENT_INDEX_CATALOG, type ComponentIndexItem } from '../mock-data/showcaseData'
import { toast } from '@/lib/toast'

interface QuickComponentFinderProps {
  onSelectComponent: (item: ComponentIndexItem) => void
}

export function QuickComponentFinder({ onSelectComponent }: QuickComponentFinderProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const filteredItems = query.trim()
    ? COMPONENT_INDEX_CATALOG.filter((item) => {
        const q = query.toLowerCase()
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.toLowerCase().includes(q))
        )
      })
    : COMPONENT_INDEX_CATALOG.slice(0, 8)

  const handleSelect = (item: ComponentIndexItem) => {
    onSelectComponent(item)
    setIsOpen(false)
    setQuery('')
    toast.info(`Đang chuyển đến: ${item.name}`)
  }

  return (
    <div className="relative w-full max-w-xl">
      {/* Quick Search Trigger Bar */}
      <div
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white/70 shadow-inner backdrop-blur-md transition-all hover:border-[var(--rogym-teal)] hover:bg-white/[0.07] cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <Search size={16} className="text-[var(--rogym-teal)] transition-transform group-hover:scale-110" />
          <span className="text-white/80 font-medium">Tìm nhanh Component / Flow...</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/20 bg-black/40 px-2 py-0.5 text-[10px] font-mono text-white/60">
            <span>⌘ / Ctrl</span>
            <span>+ K</span>
          </kbd>
        </div>
      </div>

      {/* Floating Modal Palette */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-2xl rounded-2xl border border-white/15 bg-[#14181f] p-4 shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative mb-3">
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nhập tên component, keyword (vd: modal, table, button, chart)..."
                leftIcon={<Search size={18} className="text-[var(--rogym-teal)]" />}
                rightIcon={
                  query ? (
                    <button type="button" onClick={() => setQuery('')} className="text-white/50 hover:text-white">
                      <X size={16} />
                    </button>
                  ) : null
                }
                className="bg-black/50 border-white/20 text-white placeholder:text-white/40 h-11"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-sm text-white/50">
                  Không tìm thấy component nào khớp với &quot;{query}&quot;.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center justify-between rounded-xl p-3 text-left transition-colors hover:bg-white/10 group border border-transparent hover:border-white/10"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-[var(--rogym-teal)] transition-colors">
                          {item.name}
                        </span>
                        <Badge tone={item.category === 'domain-flows' ? 'warning' : 'accent'} size="sm">
                          {item.tab}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/60 truncate">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-2 text-white/40 group-hover:text-[var(--rogym-teal)] shrink-0">
                      <span className="text-xs hidden sm:inline-block">Mở</span>
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/50">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-black/40 px-1 py-0.5 font-mono border border-white/10">Esc</kbd> Đóng
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-black/40 px-1 py-0.5 font-mono border border-white/10">↵</kbd> Chọn
                </span>
              </div>
              <span className="text-[var(--rogym-teal)] font-medium">RoGym Design System Quick Finder</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
