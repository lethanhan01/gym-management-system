import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
  'aria-label'?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  debounceMs = 300,
  className,
  'aria-label': ariaLabel = 'Tìm kiếm',
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setLocalValue(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(next), debounceMs)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('')
  }

  return (
    <div className={`relative flex items-center ${className ?? ''}`}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 rogym-text-dim"
        aria-hidden="true"
      />
      <input
        type="search"
        className="rogym-input pl-9 pr-8"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        aria-label={ariaLabel}
      />
      {localValue && (
        <button
          type="button"
          className="absolute right-3 rogym-text-dim transition-colors hover:text-white"
          onClick={handleClear}
          aria-label="Xóa tìm kiếm"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
