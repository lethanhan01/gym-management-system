import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'
import { Select } from '@/components/Select'
import {
  MemberEmptyState,
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '@/components/MemberUI'
import workoutService, { type WorkoutLog, type WorkoutLogSet } from '@/services/workout.service'
import { useAuthStore } from '@/stores/authStore'


function todayYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function completedSets(log: WorkoutLog): number {
  return log.sets?.filter((s) => s.completed).length ?? 0
}

function totalSets(log: WorkoutLog): number {
  return log.sets?.length ?? 0
}

function StatCard({ label, value, tone = 'success' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rogym-card rogym-card--md rogym-sx-55a35f1d" >
      <p className="rogym-tone-text text-xs font-semibold uppercase tracking-[0.12em]" data-tone={tone}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function MiniProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <progress className="rogym-mini-progress mt-2" max={100} value={pct} aria-label={`${pct}% set hoàn thành`} />
  )
}

function SetComparison({ set }: { set: WorkoutLogSet }) {
  const ex = set.planExercise
  const isCardio = ex?.exercise?.category === 'cardio'
  const targetVal = isCardio
    ? ex?.targetDurationSec != null
      ? `${ex.targetDurationSec} giây`
      : '—'
    : ex?.targetReps != null
      ? `${ex.targetReps} reps`
      : '—'
  const actualVal = isCardio
    ? set.actualDurationSec != null
      ? `${set.actualDurationSec} giây`
      : '—'
    : set.actualReps != null
      ? `${set.actualReps} reps`
      : '—'
  const targetKg = ex?.targetWeightKg ? `${Number(ex.targetWeightKg)} kg` : '—'
  const actualKg = set.actualWeightKg ? `${Number(set.actualWeightKg)} kg` : '—'

  return (
    <div
      className="grid gap-2 py-2 text-xs rogym-sx-8dfe0cf6"
      
    >
      <span className="rogym-sx-5e5c39ab">{set.setNumber}</span>
      <span>{targetVal}</span>
      <span className={set.completed ? 'rogym-text-green' : ''}>{actualVal}</span>
      <span>{targetKg}</span>
      <span className={set.completed ? 'rogym-text-green' : ''}>{actualKg}</span>
      <span className={set.completed ? 'rogym-text-green' : 'text-red-500'}>{set.completed ? '✓' : '✗'}</span>
    </div>
  )
}

// Months to offer in the filter
function buildMonthOptions() {
  const options: { label: string; value: string }[] = [{ label: 'Tất cả', value: '' }]
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    options.push({ value: val, label })
  }
  return options
}

export default function WorkoutHistoryPage() {
  const { user } = useAuthStore()
  const memberId = user?.memberId ? String(user.memberId) : undefined

  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterMonth, setFilterMonth] = useState('')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!memberId) return
    setLoading(true)
    setError(null)
    try {
      const data = await workoutService.getLogs({ limit: 200 })
      setLogs(data)
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status !== 403)
        setError('Không thể tải lịch sử tập luyện.')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!filterMonth) return logs
    return logs.filter((l) => l.loggedAt.startsWith(filterMonth))
  }, [logs, filterMonth])

  const currentMonthLogs = useMemo(() => {
    const ym = todayYM()
    return logs.filter((l) => l.loggedAt.startsWith(ym)).length
  }, [logs])

  const totalSetsCompleted = useMemo(() => logs.reduce((s, l) => s + completedSets(l), 0), [logs])

  const topExercise = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const log of logs) {
      for (const set of log.sets ?? []) {
        const name = set.planExercise?.exercise?.name
        if (name) counts[name] = (counts[name] ?? 0) + 1
      }
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top ? top[0] : '—'
  }, [logs])

  const monthOptions = buildMonthOptions()

  function toggleLog(id: string) {
    setExpandedLogs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Lịch sử"
        title="Lịch sử tập luyện"
        description="Các buổi tập đã ghi nhận kết quả thực tế"
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tổng buổi đã log" value={loading ? '—' : String(logs.length)} />
        <StatCard
          label="Buổi tháng này"
          value={loading ? '—' : String(currentMonthLogs)}
          tone="warning"
        />
        <StatCard label="Bài tập nhiều nhất" value={loading ? '—' : topExercise} />
        <StatCard label="Set hoàn thành" value={loading ? '—' : String(totalSetsCompleted)} />
      </div>

      {/* Filter */}
      <div
        
        className="flex items-center gap-3 rogym-sx-58e694fd"
      >
        <label className="text-sm font-medium rogym-sx-d88f932f" >
          Lọc theo tháng:
        </label>
        <Select value={filterMonth} onValueChange={setFilterMonth} className="min-w-[160px]">
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {error && <MemberErrorState message={error} onRetry={load} />}

      {loading ? (
        <MemberSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <MemberEmptyState
          title="Chưa có buổi tập nào"
          description={
            filterMonth
              ? 'Không có buổi tập nào trong tháng này.'
              : 'Bắt đầu tập và ghi nhận kết quả để xem lịch sử.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => {
            const expanded = expandedLogs.has(log.logId)
            const done = completedSets(log)
            const total = totalSets(log)
            const exercises = groupSetsByExercise(log.sets ?? [])

            return (
              <div
                key={log.logId}
                className="rogym-card rogym-card--compact rogym-sx-3f1e9a27"
                
              >
                {/* Log header */}
                <div
                  className="flex cursor-pointer items-center justify-between p-4"
                  onClick={() => toggleLog(log.logId)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl rogym-sx-252b3c13"
                      
                    >
                      <Dumbbell size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{log.planDay?.name ?? 'Buổi tập'}</p>
                      <p className="text-xs rogym-sx-5e5c39ab" >
                        {fmtDate(log.loggedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-medium text-white">
                        {done}/{total} set
                      </p>
                      <MiniProgressBar done={done} total={total} />
                    </div>
                    <span className="rogym-sx-5e5c39ab">
                      {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </div>
                </div>

                {/* Detail */}
                {expanded && (
                  <div
                    className="px-4 pb-4 rogym-sx-8553bf9e"
                    
                  >
                    {exercises.length === 0 ? (
                      <p className="py-3 text-sm rogym-sx-5e5c39ab" >
                        Không có dữ liệu set.
                      </p>
                    ) : (
                      exercises.map((group) => (
                        <div key={group.name} className="mt-4">
                          <p className="mb-2 text-sm font-semibold text-white">{group.name}</p>
                          {/* Column headers */}
                          <div
                            className="grid gap-2 pb-1 text-xs font-medium uppercase rogym-sx-55da34ac"
                            
                          >
                            <span>#</span>
                            <span>Target</span>
                            <span>Thực tế</span>
                            <span>KG target</span>
                            <span>KG thực</span>
                            <span />
                          </div>
                          {group.sets.map((s) => (
                            <SetComparison key={s.logSetId} set={s} />
                          ))}
                        </div>
                      ))
                    )}
                    {log.notes && (
                      <p className="mt-3 text-xs rogym-sx-5e5c39ab" >
                        Ghi chú: {log.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </MemberPage>
  )
}

function groupSetsByExercise(sets: WorkoutLogSet[]): { name: string; sets: WorkoutLogSet[] }[] {
  const map = new Map<string, { name: string; sets: WorkoutLogSet[] }>()
  for (const s of sets) {
    const id = s.planExercise?.exerciseId ?? s.planExerciseId
    const name = s.planExercise?.exercise?.name ?? `Bài tập ${s.planExerciseId}`
    if (!map.has(id)) map.set(id, { name, sets: [] })
    map.get(id)!.sets.push(s)
  }
  return [...map.values()]
}
