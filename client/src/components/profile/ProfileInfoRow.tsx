export function ProfileInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-3 text-sm">
      <span className="rogym-text-dim">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  )
}
