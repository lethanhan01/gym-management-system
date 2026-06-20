import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  MemberEmptyState,
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '@/components/MemberUI'
import workoutService, { type Exercise, type ExerciseCategory } from '@/services/workout.service'
import { getApiError } from '@/lib/api-error'
import { ExerciseCard, ExerciseCategoryFilterPopover } from '@/components/workout/ExerciseUI'
import { filterExercises, getExerciseCategoryLabel } from '@/components/workout/exercise-data'

export default function MemberExercisesPage() {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Exercise | null>(null)

  // Filter popup
  const [showPopup, setShowPopup] = useState(false)
  const [draftCategory, setDraftCategory] = useState<ExerciseCategory | ''>('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setExercises(await workoutService.getExercises({ category: category || undefined }))
    } catch (err) {
      setError(getApiError(err, 'Không thể tải thư viện bài tập.'))
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => filterExercises(exercises, search, '', true), [exercises, search])

  const activeCount = category ? 1 : 0

  function openPopup() {
    setDraftCategory(category)
    setShowPopup(true)
  }

  function applyFilter() {
    setCategory(draftCategory)
    setShowPopup(false)
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Lịch tập"
        title="Thư viện bài tập"
        description="Các bài tập do PT đề xuất — dùng để xây dựng kế hoạch cá nhân"
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => navigate('/member/workout/builder')}
          >
            <Dumbbell size={15} /> Mở Plan Builder
          </button>
        }
      />

      {/* Search + filter */}
      <div className="flex items-center gap-3 rogym-sx-d9d481c1">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 rogym-sx-5e5c39ab"
            size={15}
          />
          <input
            className="rogym-input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, nhóm cơ, dụng cụ..."
          />
        </div>

        {/* Filter button + popup */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={openPopup}
            className={`rogym-filter-trigger flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              activeCount > 0 ? 'is-active' : ''
            }`}
          >
            <SlidersHorizontal size={13} />
            Lọc
            {activeCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold rogym-sx-fc269f1b">
                {activeCount}
              </span>
            )}
          </button>

          <ExerciseCategoryFilterPopover
            open={showPopup}
            value={draftCategory}
            onChange={setDraftCategory}
            onApply={applyFilter}
            onClose={() => setShowPopup(false)}
          />
        </div>
      </div>

      {error && <MemberErrorState message={error} onRetry={load} />}

      {loading ? (
        <MemberSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <MemberEmptyState
          title="Không tìm thấy bài tập"
          description="Thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.exerciseId}
              exercise={exercise}
              onClick={() => setDetail(exercise)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 rogym-sx-8578aed4"
          onClick={() => setDetail(null)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-[24px] rogym-sx-1f8ae2ef"
            onClick={(e) => e.stopPropagation()}
          >
            {detail.imageUrl && (
              <div className="aspect-[16/7] overflow-hidden">
                <img
                  src={detail.imageUrl}
                  alt={`Minh họa ${detail.name}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">{detail.name}</h2>
                  <p className="mt-1 text-xs uppercase tracking-wider rogym-sx-f27dac31">
                    {getExerciseCategoryLabel(detail.category)}
                  </p>
                </div>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                  onClick={() => setDetail(null)}
                  aria-label="Đóng"
                >
                  <X size={16} />
                </button>
              </div>
              {detail.description && (
                <p className="mt-4 text-sm leading-7 rogym-sx-d88f932f">{detail.description}</p>
              )}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-xl p-3 rogym-sx-a38688f0">
                  <p className="text-xs rogym-sx-5e5c39ab">Nhóm cơ</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {detail.muscleGroup ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl p-3 rogym-sx-a38688f0">
                  <p className="text-xs rogym-sx-5e5c39ab">Dụng cụ cần</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {detail.equipmentNeeded ?? 'Không cần'}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white flex-1 justify-center"
                  onClick={() => setDetail(null)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary flex-1 justify-center"
                  onClick={() => {
                    setDetail(null)
                    navigate('/member/workout/builder')
                  }}
                >
                  <Dumbbell size={14} /> Thêm vào Plan Builder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MemberPage>
  )
}
