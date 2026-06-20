import { Children, isValidElement, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Select as RadixSelect } from 'radix-ui'
import { cn } from '@/lib/utils'

const EMPTY_SELECT_VALUE = '__rogym_empty__'

type SelectOptionProps = {
  children?: ReactNode
  disabled?: boolean
  value?: string | number
}

export function Select({
  children,
  className,
  value,
  onValueChange,
  disabled,
  required,
  name,
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  name?: string
  ariaLabel?: string
}) {
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<SelectOptionProps>(child)) return []
    return [
      {
        disabled: child.props.disabled,
        label: child.props.children,
        value: String(child.props.value ?? ''),
      },
    ]
  })
  const emptyOption = options.find((option) => option.value === '')
  const selectedValue = value || (required ? '' : EMPTY_SELECT_VALUE)

  return (
    <RadixSelect.Root
      value={selectedValue}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === EMPTY_SELECT_VALUE ? '' : nextValue)
      }
      disabled={disabled}
      required={required}
      name={name}
    >
      <RadixSelect.Trigger
        className={cn('rogym-select', className)}
        aria-label={ariaLabel}
        data-no-sweep
      >
        <RadixSelect.Value placeholder={emptyOption?.label} />
        <RadixSelect.Icon className="rogym-select__icon">
          <ChevronDown size={17} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="rogym-select__content"
          position="popper"
          sideOffset={8}
          align="start"
        >
          <RadixSelect.Viewport className="rogym-select__viewport">
            {options
              .filter((option) => !required || option.value !== '')
              .map((option) => {
                const optionValue = option.value || EMPTY_SELECT_VALUE
                return (
                  <RadixSelect.Item
                    key={optionValue}
                    className="rogym-select__item"
                    value={optionValue}
                    disabled={option.disabled}
                  >
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                    <RadixSelect.ItemIndicator className="rogym-select__indicator">
                      <Check size={15} />
                    </RadixSelect.ItemIndicator>
                  </RadixSelect.Item>
                )
              })}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
