import { useEffect, useState, type ChangeEvent } from 'react'
import { DayPicker, type DropdownProps } from 'react-day-picker'
import { Popover } from 'radix-ui'
import { Calendar } from 'lucide-react'
import { format, parse, isValid, isAfter, isBefore } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Select } from '@/components/Select'
import { cn } from '@/lib/utils'
import 'react-day-picker/dist/style.css'

const DEFAULT_FROM_YEAR = 1900
const DEFAULT_FUTURE_YEARS = 20

function CalendarDropdown({
  children,
  className,
  name,
  onChange,
  style,
  value,
  'aria-label': ariaLabel,
}: DropdownProps) {
  function handleValueChange(nextValue: string) {
    onChange?.({ target: { value: nextValue } } as ChangeEvent<HTMLSelectElement>)
  }

  return (
    <div className={className} style={style}>
      <Select
        name={name}
        ariaLabel={ariaLabel}
        className="rogym-date-picker__select"
        value={String(value ?? '')}
        onValueChange={handleValueChange}
      >
        {children}
      </Select>
    </div>
  )
}

interface DatePickerInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  min?: string
  max?: string
  'aria-label'?: string
  required?: boolean
  className?: string
}

function tryParseUserInput(text: string): Date | null {
  for (const fmt of ['dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'dd/MM/yy']) {
    const d = parse(text, fmt, new Date())
    if (isValid(d)) return d
  }
  return null
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  disabled = false,
  min,
  max,
  'aria-label': ariaLabel,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [inputText, setInputText] = useState('')

  const selected = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const validSelected = selected && isValid(selected) ? selected : undefined

  const parsedMin = min ? parse(min, 'yyyy-MM-dd', new Date()) : undefined
  const parsedMax = max ? parse(max, 'yyyy-MM-dd', new Date()) : undefined
  const fromDate = parsedMin && isValid(parsedMin) ? parsedMin : undefined
  const toDate = parsedMax && isValid(parsedMax) ? parsedMax : undefined
  const currentYear = new Date().getFullYear()
  const calendarFromDate = fromDate ?? new Date(DEFAULT_FROM_YEAR, 0, 1)
  const calendarToDate =
    toDate ??
    new Date(
      fromDate
        ? Math.max(
            currentYear + DEFAULT_FUTURE_YEARS,
            fromDate.getFullYear() + DEFAULT_FUTURE_YEARS
          )
        : currentYear + DEFAULT_FUTURE_YEARS,
      11,
      31
    )

  // Sync display text from external value when not actively typing
  useEffect(() => {
    if (!focused) {
      setInputText(validSelected ? format(validSelected, 'dd/MM/yyyy') : '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleSelect(date: Date | undefined) {
    if (!date) return
    onChange(format(date, 'yyyy-MM-dd'))
    setOpen(false)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value
    setInputText(text)

    if (text === '') {
      onChange('')
      return
    }

    const parsed = tryParseUserInput(text)
    if (parsed) {
      if (isBefore(parsed, calendarFromDate)) return
      if (isAfter(parsed, calendarToDate)) return
      onChange(format(parsed, 'yyyy-MM-dd'))
    }
  }

  function handleFocus() {
    setFocused(true)
    setOpen(true)
  }

  function handleBlur() {
    setFocused(false)
    // Normalize to canonical display format, or clear if input can't be parsed
    setInputText(validSelected ? format(validSelected, 'dd/MM/yyyy') : '')
  }

  const displayText = focused ? inputText : (validSelected ? format(validSelected, 'dd/MM/yyyy') : '')

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Anchor asChild>
        <div className={cn('relative', className)}>
          <input
            type="text"
            disabled={disabled}
            aria-label={ariaLabel}
            value={displayText}
            onChange={handleTextChange}
            onFocus={handleFocus}
            onClick={() => setOpen(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn(
              'rogym-input pr-10',
              !displayText && 'placeholder:text-white/20'
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setOpen(!open)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rogym-text-muted hover:text-white transition-colors"
            aria-label="Mở lịch"
          >
            <Calendar size={16} className="shrink-0" />
          </button>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="rogym-date-picker__popover rogym-date-picker__popover--compact"
        >
          <DayPicker
            mode="single"
            selected={validSelected}
            onSelect={handleSelect}
            locale={vi}
            fromDate={calendarFromDate}
            toDate={calendarToDate}
            captionLayout="dropdown"
            components={{ Dropdown: CalendarDropdown }}
            showOutsideDays
            classNames={{
              root: 'rdp rogym-date-picker',
              months: 'flex flex-col',
              month: 'space-y-2',
              caption: 'rogym-date-picker__caption',
              caption_dropdowns: 'rogym-date-picker__caption-dropdowns',
              caption_label: 'rogym-date-picker__caption-label',
              dropdown_month: 'rogym-date-picker__dropdown is-month',
              dropdown_year: 'rogym-date-picker__dropdown is-year',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'rogym-text-muted w-8 text-center text-xs font-normal pb-1',
              row: 'flex w-full mt-0.5',
              cell: 'h-8 w-8 text-center text-sm relative',
              day: cn(
                'h-8 w-8 p-0 font-normal rounded-lg',
                'rogym-text-secondary',
                'hover:bg-[var(--rogym-green)] hover:rogym-text-green-dark',
                'transition-colors'
              ),
              day_selected: cn(
                'bg-[var(--rogym-green)] rogym-text-green-dark',
                'font-semibold',
                'hover:bg-[var(--rogym-green-hover)]'
              ),
              day_today: 'border border-[var(--rogym-teal)] rogym-text-accent font-semibold',
              day_outside: 'text-white/20',
              day_disabled: 'text-white/15 cursor-not-allowed',
              day_hidden: 'invisible',
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
