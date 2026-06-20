import { useState, type ChangeEvent } from 'react'
import { DayPicker, type DropdownProps } from 'react-day-picker'
import { Popover } from 'radix-ui'
import { Calendar, Clock3 } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
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

interface DateTimePickerInputProps {
  value: string // format: 'yyyy-MM-ddTHH:mm'
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  min?: string // 'yyyy-MM-dd' or 'yyyy-MM-ddTHH:mm' — only date part used for calendar constraint
  max?: string
  'aria-label'?: string
  className?: string
  minuteStep?: number
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function DateTimePickerInput({
  value,
  onChange,
  placeholder = 'Chọn ngày & giờ',
  disabled = false,
  min,
  max,
  'aria-label': ariaLabel,
  className,
  minuteStep = 5,
}: DateTimePickerInputProps) {
  const [open, setOpen] = useState(false)

  const [datePart, timePart] = value ? value.split('T') : ['', '']
  const parsedDate = datePart ? parse(datePart, 'yyyy-MM-dd', new Date()) : undefined
  const validDate = parsedDate && isValid(parsedDate) ? parsedDate : undefined

  const [hStr, mStr] = timePart ? timePart.split(':') : ['', '']
  const selectedHour = hStr ? parseInt(hStr, 10) : undefined
  const selectedMinute = mStr ? parseInt(mStr, 10) : undefined

  const parsedMin = min ? parse(min.slice(0, 10), 'yyyy-MM-dd', new Date()) : undefined
  const parsedMax = max ? parse(max.slice(0, 10), 'yyyy-MM-dd', new Date()) : undefined
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

  function handleDateSelect(date: Date | undefined) {
    if (!date) return
    const d = format(date, 'yyyy-MM-dd')
    const h = selectedHour ?? 8
    const m = selectedMinute ?? 0
    onChange(`${d}T${pad(h)}:${pad(m)}`)
  }

  function handleHourSelect(h: number) {
    const d = validDate ? format(validDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    const m = selectedMinute ?? 0
    onChange(`${d}T${pad(h)}:${pad(m)}`)
  }

  function handleMinuteSelect(m: number) {
    const d = validDate ? format(validDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    const h = selectedHour ?? 8
    onChange(`${d}T${pad(h)}:${pad(m)}`)
  }

  const displayValue = validDate
    ? selectedHour !== undefined
      ? `${format(validDate, 'dd/MM/yyyy')} ${pad(selectedHour)}:${pad(selectedMinute ?? 0)}`
      : format(validDate, 'dd/MM/yyyy')
    : ''

  return (
    <Popover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'rogym-input flex items-center justify-between gap-2 text-left',
            !displayValue && 'text-white/20',
            className
          )}
        >
          <span>{displayValue || placeholder}</span>
          <Calendar size={16} className="shrink-0 rogym-text-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="rogym-date-picker__popover"
        >
          <DayPicker
            mode="single"
            selected={validDate}
            onSelect={handleDateSelect}
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

          {/* Time picker */}
          <div className="mt-2 border-t border-white/10 pt-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Clock3 size={13} className="rogym-text-muted" />
              <span className="text-xs font-medium rogym-text-secondary">
                Thời gian
              </span>
              {selectedHour !== undefined && (
                <span
                  className="ml-auto font-mono text-sm font-semibold rogym-sx-0a282bee"
                  
                >
                  {pad(selectedHour)}:{pad(selectedMinute ?? 0)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={23}
                step={1}
                value={selectedHour ?? ''}
                onChange={(e) => handleHourSelect(Number(e.target.value))}
                className="rogym-input w-16 text-center font-mono"
                placeholder="HH"
              />
              <span className="text-base font-bold rogym-text-muted">:</span>
              <input
                type="number"
                min={0}
                max={59}
                step={minuteStep}
                value={selectedMinute ?? ''}
                onChange={(e) => handleMinuteSelect(Number(e.target.value))}
                className="rogym-input w-16 text-center font-mono"
                placeholder="MM"
              />
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
