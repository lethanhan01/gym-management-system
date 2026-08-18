import { FormField, Input } from '@/components/ui'

export function ProfilePasswordField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <FormField label={label} required>
      <Input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </FormField>
  )
}

