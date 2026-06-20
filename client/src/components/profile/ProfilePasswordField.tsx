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
    <label className="block space-y-2">
      <span className="rogym-field-label">{label}</span>
      <input
        className="rogym-input"
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  )
}
