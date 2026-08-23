import { useState, useRef, type KeyboardEvent, forwardRef } from 'react'
import { Chip, type ChipTone } from './Chip'
import { cn } from '@/lib/utils'
import { useFormField } from './form-field-context'

export interface TagInputProps {
  value?: string[]
  defaultValue?: string[]
  onChange?: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  disabled?: boolean
  tone?: ChipTone
  className?: string
  error?: boolean | string
  allowDuplicates?: boolean
}

export const TagInput = forwardRef<HTMLDivElement, TagInputProps>(
  (
    {
      value,
      defaultValue = [],
      onChange,
      placeholder = 'Nhập thẻ và nhấn Enter...',
      maxTags,
      disabled = false,
      tone = 'accent',
      className,
      error,
      allowDuplicates = false,
    },
    ref
  ) => {
    const formField = useFormField()
    const isControlled = value !== undefined
    const [internalTags, setInternalTags] = useState<string[]>(defaultValue)
    const [inputVal, setInputVal] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const effectiveTags = isControlled ? (value ?? []) : internalTags
    const effectiveDisabled = disabled || formField?.disabled
    const hasError = !!error || formField?.hasError
    const isFull = maxTags !== undefined && effectiveTags.length >= maxTags

    function updateTags(nextTags: string[]) {
      if (!isControlled) {
        setInternalTags(nextTags)
      }
      onChange?.(nextTags)
    }

    function addTag(rawTag: string) {
      const tag = rawTag.trim()
      if (!tag) return
      if (!allowDuplicates && effectiveTags.includes(tag)) {
        setInputVal('')
        return
      }
      if (isFull) return

      updateTags([...effectiveTags, tag])
      setInputVal('')
    }

    function removeTag(index: number) {
      if (effectiveDisabled) return
      const nextTags = effectiveTags.filter((_, i) => i !== index)
      updateTags(nextTags)
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addTag(inputVal)
      } else if (e.key === 'Backspace' && !inputVal && effectiveTags.length > 0) {
        removeTag(effectiveTags.length - 1)
      }
    }

    return (
      <div
        ref={ref}
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex min-h-[44px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-sm text-white transition-colors duration-150',
          'hover:border-[var(--rogym-teal)]/50 hover:bg-white/[0.06]',
          'focus-within:border-[var(--rogym-teal)] focus-within:ring-1 focus-within:ring-[var(--rogym-teal)]/30',
          effectiveDisabled && 'pointer-events-none opacity-40 bg-white/[0.02]',
          hasError &&
            'border-red-500/80 focus-within:border-red-400 focus-within:ring-red-400/30',
          className
        )}
      >
        {effectiveTags.map((tag, idx) => (
          <Chip
            key={`${tag}-${idx}`}
            label={tag}
            tone={tone}
            size="sm"
            removable={!effectiveDisabled}
            onRemove={() => removeTag(idx)}
            disabled={effectiveDisabled}
          />
        ))}

        {!isFull && !effectiveDisabled && (
          <input
            ref={inputRef}
            type="text"
            id={formField?.id}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag(inputVal)}
            placeholder={effectiveTags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent py-1 px-1 text-xs text-white placeholder:text-white/30 focus:outline-none"
          />
        )}
      </div>
    )
  }
)
TagInput.displayName = 'TagInput'
