import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
  MemberErrorState,
} from '@/components/MemberUI'
import { trainingService, type MemberProgress } from '@/services/training.service'
import { memberService } from '@/services/member.service'
import { useAuthStore } from '@/stores/authStore'
import { getApiError } from '@/lib/api-error'

const MemberWeightChart = lazy(() => import('@/components/charts/MemberWeightChart'))

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtDateShort(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return 'Thiếu cân'
  if (bmi < 25) return 'Bình thường'
  if (bmi < 30) return 'Thừa cân'
  return 'Béo phì'
}

function bmiTone(bmi: number): string {
  if (bmi < 18.5) return 'warning'
  if (bmi < 25) return 'success'
  if (bmi < 30) return 'warning'
  return 'danger'
}

function computeBmi(weightKg: number, heightCm: number): number {
  const hm = heightCm / 100
  return Math.round((weightKg / (hm * hm)) * 10) / 10
}

const RANGES = [
  { label: '1T', days: 30 },
  { label: '3T', days: 90 },
  { label: '6T', days: 180 },
  { label: 'Tất cả', days: null as number | null },
]

function SelfReportForm({ onSuccess }: { onSuccess: () => void }) {
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weightNum = parseFloat(weight)
  const heightNum = parseFloat(height)
  const previewBmi =
    !isNaN(weightNum) && weightNum > 0 && !isNaN(heightNum) && heightNum > 0
      ? computeBmi(weightNum, heightNum)
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Cân nặng không hợp lệ.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await memberService.recordSelfProgress({
        weight: weightNum,
        height: !isNaN(heightNum) && heightNum > 0 ? heightNum : undefined,
      })
      setWeight('')
      setHeight('')
      onSuccess()
    } catch (err) {
      setError(getApiError(err, 'Không thể lưu chỉ số. Vui lòng thử lại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rogym-sx-103d1cc8 p-5">
      <p className="text-sm font-semibold text-white mb-4">Ghi chỉ số mới</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs rogym-sx-6e4f9432">Cân nặng (kg)</label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="500"
              placeholder="Vd: 65.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="input-base"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs rogym-sx-6e4f9432">Chiều cao (cm)</label>
            <input
              type="number"
              step="0.1"
              min="50"
              max="300"
              placeholder="Vd: 170"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="input-base"
            />
          </div>
        </div>

        {previewBmi != null && (
          <div className="flex items-center gap-2 text-sm">
            <span className="rogym-sx-d88f932f">BMI dự tính:</span>
            <span className="rogym-tone-text font-semibold" data-tone={bmiTone(previewBmi)}>
              {previewBmi.toFixed(1)} — {bmiLabel(previewBmi)}
            </span>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary self-start">
          {submitting ? 'Đang lưu...' : 'Lưu chỉ số'}
        </button>
      </form>
    </div>
  )
}

export default function ProgressPage() {
  const memberId = useAuthStore((state) => state.user?.memberId)
  const [data, setData] = useState<MemberProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeIdx, setRangeIdx] = useState(3)
  const [showForm, setShowForm] = useState(false)

  const loadProgress = useCallback(async () => {
    if (!memberId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setData(await trainingService.listProgress(String(memberId)))
    } catch (err) {
      setError(getApiError(err, 'Không thể tải dữ liệu tiến độ.'))
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void loadProgress()
  }, [loadProgress])

  const filtered = useMemo(() => {
    const days = RANGES[rangeIdx].days
    if (!days) return data
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return data.filter((d) => new Date(d.recordedAt) >= cutoff)
  }, [data, rangeIdx])

  function handleFormSuccess() {
    setShowForm(false)
    void loadProgress()
  }

  const latest = data[0]
  const chartData = useMemo(
    () =>
      filtered
        .filter((entry): entry is MemberProgress & { weight: number } => entry.weight != null)
        .map((entry) => ({ date: fmtDateShort(entry.recordedAt), weight: entry.weight }))
        .reverse(),
    [filtered]
  )

  return (
    <MemberPage>
      <div className="flex items-start justify-between gap-4">
        <MemberPageHeader
          eyebrow="Sức khoẻ & Thể chất"
          title="Tiến độ của tôi"
          description="Theo dõi cân nặng, chiều cao và chỉ số BMI"
        />
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary shrink-0 mt-1">
          {showForm ? 'Đóng' : 'Ghi chỉ số'}
        </button>
      </div>

      {showForm && <SelfReportForm onSuccess={handleFormSuccess} />}

      {loading ? (
        <MemberSkeleton rows={4} />
      ) : error ? (
        <MemberErrorState message={error} onRetry={loadProgress} />
      ) : data.length === 0 ? (
        <>{!showForm && <SelfReportForm onSuccess={handleFormSuccess} />}</>
      ) : (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rogym-sx-103d1cc8">
              <p className="text-xs font-semibold uppercase tracking-wider rogym-sx-6e4f9432">
                Cân nặng hiện tại
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {latest.weight != null ? `${latest.weight} kg` : '—'}
              </p>
              <p className="mt-1 text-xs rogym-sx-d88f932f">Ghi lúc {fmtDate(latest.recordedAt)}</p>
            </div>
            <div className="rogym-sx-103d1cc8">
              <p className="text-xs font-semibold uppercase tracking-wider rogym-sx-6e4f9432">
                BMI hiện tại
              </p>
              <p
                className="rogym-tone-text mt-2 text-3xl font-bold"
                data-tone={latest.bmi != null ? bmiTone(latest.bmi) : 'default'}
              >
                {latest.bmi != null ? latest.bmi.toFixed(1) : '—'}
              </p>
              {latest.bmi != null && (
                <p className="mt-1 text-xs rogym-sx-d88f932f">{bmiLabel(latest.bmi)}</p>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="rogym-sx-103d1cc8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Biểu đồ cân nặng</p>
              <div className="flex gap-1">
                {RANGES.map((r, i) => (
                  <button
                    key={r.label}
                    onClick={() => setRangeIdx(i)}
                    className={`rogym-range-chip rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      rangeIdx === i ? 'is-active' : ''
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length < 2 ? (
              <p className="py-8 text-center text-sm rogym-sx-d88f932f">
                Cần ít nhất 2 lần đo cân nặng để hiển thị biểu đồ
              </p>
            ) : (
              <Suspense
                fallback={<div className="h-[220px] animate-pulse rounded-xl bg-white/5" />}
              >
                <MemberWeightChart data={chartData} />
              </Suspense>
            )}
          </div>

          {/* History */}
          <div className="rogym-sx-103d1cc8">
            <p className="mb-4 text-sm font-semibold text-white">Lịch sử đo chỉ số</p>
            <div>
              {filtered.map((entry) => (
                <div
                  key={entry.progressId}
                  className="rogym-list-row flex items-start justify-between py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium rogym-sx-d88f932f">
                      {fmtDate(entry.recordedAt)}
                    </p>
                    {entry.goal && <p className="mt-0.5 text-sm text-white">{entry.goal}</p>}
                    {entry.notes && (
                      <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">{entry.notes}</p>
                    )}
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    {entry.weight != null && (
                      <p className="text-sm font-semibold text-white">{entry.weight} kg</p>
                    )}
                    {entry.height != null && (
                      <p className="text-xs rogym-sx-d88f932f mt-0.5">{entry.height} cm</p>
                    )}
                    {entry.bmi != null && (
                      <p className="rogym-tone-text text-xs mt-0.5" data-tone={bmiTone(entry.bmi)}>
                        BMI {entry.bmi.toFixed(1)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </MemberPage>
  )
}
