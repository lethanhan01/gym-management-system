import {
  useState,
  useRef,
  type DragEvent,
  type ChangeEvent,
  forwardRef,
} from 'react'
import { UploadCloud, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react'
import { Button } from './Button'
import { ProgressBar } from './ProgressBar'
import { cn } from '@/lib/utils'
import { useFormField } from './form-field-context'

export interface FileUploadProps {
  value?: File | string | null
  onChange?: (file: File | null) => void
  accept?: string
  maxSizeMB?: number
  variant?: 'dropzone' | 'avatar' | 'compact'
  placeholder?: string
  helperText?: string
  disabled?: boolean
  loading?: boolean
  progress?: number
  error?: boolean | string
  className?: string
}

export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      value,
      onChange,
      accept = 'image/*',
      maxSizeMB = 5,
      variant = 'dropzone',
      placeholder = 'Kéo thả tệp vào đây hoặc nhấn để chọn',
      helperText,
      disabled = false,
      loading = false,
      progress,
      error,
      className,
    },
    ref
  ) => {
    const formField = useFormField()
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
      if (typeof value === 'string') return value
      if (value instanceof File) return URL.createObjectURL(value)
      return null
    })
    const [fileError, setFileError] = useState<string | null>(null)

    const effectiveDisabled = disabled || formField?.disabled || loading
    const effectiveError = error || fileError || formField?.error

    function handleFile(file: File | null) {
      if (!file) {
        setPreviewUrl(null)
        setFileError(null)
        onChange?.(null)
        return
      }

      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        setFileError(`Kích thước tệp vượt quá ${maxSizeMB}MB`)
        return
      }

      setFileError(null)
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      } else {
        setPreviewUrl(null)
      }

      onChange?.(file)
    }

    function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0] ?? null
      handleFile(file)
    }

    function handleDragOver(e: DragEvent<HTMLDivElement>) {
      e.preventDefault()
      if (effectiveDisabled) return
      setIsDragging(true)
    }

    function handleDragLeave(e: DragEvent<HTMLDivElement>) {
      e.preventDefault()
      setIsDragging(false)
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
      e.preventDefault()
      setIsDragging(false)
      if (effectiveDisabled) return
      const file = e.dataTransfer.files?.[0] ?? null
      handleFile(file)
    }

    function handleClear(e: React.MouseEvent) {
      e.stopPropagation()
      if (inputRef.current) inputRef.current.value = ''
      handleFile(null)
    }

    // Avatar mode
    if (variant === 'avatar') {
      return (
        <div ref={ref} className={cn('flex items-center gap-4', className)}>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            disabled={effectiveDisabled}
            onChange={handleInputChange}
            className="hidden"
          />
          <div
            onClick={() => !effectiveDisabled && inputRef.current?.click()}
            className={cn(
              'group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-white/20 bg-white/[0.03] transition-all',
              'hover:border-[var(--rogym-teal)] hover:bg-white/[0.06]',
              effectiveError && 'border-red-500/80',
              effectiveDisabled && 'pointer-events-none opacity-40'
            )}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Avatar preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon size={24} className="rogym-text-dim group-hover:text-white" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <UploadCloud size={20} className="text-white" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline-white"
              size="sm"
              disabled={effectiveDisabled}
              onClick={() => inputRef.current?.click()}
            >
              Chọn ảnh đại diện
            </Button>
            {helperText && <p className="text-xs rogym-text-dim">{helperText}</p>}
            {effectiveError && typeof effectiveError === 'string' && (
              <p className="text-xs text-red-400 font-medium">{effectiveError}</p>
            )}
          </div>
        </div>
      )
    }

    // Dropzone mode
    return (
      <div ref={ref} className={cn('w-full space-y-2', className)}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={effectiveDisabled}
          onChange={handleInputChange}
          className="hidden"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !effectiveDisabled && inputRef.current?.click()}
          className={cn(
            'group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition-all duration-150 cursor-pointer',
            'hover:border-[var(--rogym-teal)]/50 hover:bg-white/[0.04]',
            isDragging && 'border-[var(--rogym-teal)] bg-[var(--rogym-teal)]/[0.05] ring-2 ring-[var(--rogym-teal)]/30',
            effectiveError && 'border-red-500/80 bg-red-500/[0.02]',
            effectiveDisabled && 'pointer-events-none opacity-40 cursor-not-allowed'
          )}
        >
          {previewUrl ? (
            <div className="relative flex flex-col items-center gap-3">
              <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-white/10 shadow-md">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={handleClear}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                  aria-label="Xóa ảnh"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-[var(--rogym-teal)] font-medium flex items-center gap-1">
                <CheckCircle2 size={13} /> Nhấn hoặc kéo thả để thay đổi tệp
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-[var(--rogym-teal)] group-hover:scale-105 transition-transform">
                <UploadCloud size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{placeholder}</p>
                <p className="mt-1 text-xs rogym-text-dim">
                  {helperText ?? `Tối đa ${maxSizeMB}MB (Hỗ trợ PNG, JPG, WEBP)`}
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/75 backdrop-blur-sm p-4">
              <span className="mb-2 text-xs font-semibold text-white">Đang tải lên...</span>
              <ProgressBar
                value={progress ?? 50}
                tone="primary"
                className="w-48 max-w-full"
              />
            </div>
          )}
        </div>

        {effectiveError && typeof effectiveError === 'string' && (
          <p className="text-xs text-red-400 font-medium">{effectiveError}</p>
        )}
      </div>
    )
  }
)
FileUpload.displayName = 'FileUpload'
