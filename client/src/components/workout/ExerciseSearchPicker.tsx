import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Dumbbell, Loader2 } from 'lucide-react'
import workoutService, {
  type Exercise,
  type ExerciseBodyPart,
  type ExerciseEquipment,
  type ExerciseMuscle,
} from '@/services/workout.service'
import { SearchToolbar } from '@/components/ui/SearchToolbar'
import { ExerciseFilterDropdown } from '@/components/workout/ExerciseUI'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface ExerciseSearchPickerProps {
  selectedExerciseId?: string | null
  selectedExercise?: Exercise | null
  onSelectExercise: (exercise: Exercise) => void
  className?: string
  listMaxHeight?: string
  showPreview?: boolean
}

export const ExerciseSearchPicker = memo(function ExerciseSearchPicker({
  selectedExerciseId,
  selectedExercise,
  onSelectExercise,
  className,
  listMaxHeight = 'max-h-60',
  showPreview = true,
}: ExerciseSearchPickerProps) {
  const { t } = useTranslation(['trainer', 'member', 'common'])
  const [search, setSearch] = useState('')
  const [bodyPartId, setBodyPartId] = useState<number | undefined>()
  const [targetMuscleId, setTargetMuscleId] = useState<number | undefined>()
  const [equipmentId, setEquipmentId] = useState<number | undefined>()

  // Filter dropdown state
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftBodyPartId, setDraftBodyPartId] = useState<number | undefined>()
  const [draftTargetMuscleId, setDraftTargetMuscleId] = useState<number | undefined>()
  const [draftEquipmentId, setDraftEquipmentId] = useState<number | undefined>()

  // Lookup options
  const [bodyParts, setBodyParts] = useState<ExerciseBodyPart[]>([])
  const [muscles, setMuscles] = useState<ExerciseMuscle[]>([])
  const [equipments, setEquipments] = useState<ExerciseEquipment[]>([])

  // Exercises data
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Track latest request to avoid race conditions
  const requestSeq = useRef(0)

  // Load lookups once
  useEffect(() => {
    let mounted = true
    void Promise.all([
      workoutService.getBodyParts(),
      workoutService.getMuscles(),
      workoutService.getEquipments(),
    ])
      .then(([bp, mu, eq]) => {
        if (!mounted) return
        setBodyParts(bp)
        setMuscles(mu)
        setEquipments(eq)
      })
      .catch((err) => {
        console.error('Failed to load exercise lookups', err)
      })
    return () => {
      mounted = false
    }
  }, [])

  // Fetch initial/filtered page of exercises (page 1)
  const fetchExercises = useCallback(
    async (
      q: string,
      bpId: number | undefined,
      mId: number | undefined,
      eqId: number | undefined
    ) => {
      const seq = ++requestSeq.current
      setLoading(true)
      try {
        const res = await workoutService.getExercises({
          q: q.trim() || undefined,
          bodyPartId: bpId,
          targetMuscleId: mId,
          equipmentId: eqId,
          page: 1,
          pageSize: 24,
        })
        if (seq === requestSeq.current) {
          setExercises(res.data)
          setPage(res.meta.page)
          setTotalPages(res.meta.totalPages)
          setTotalCount(res.meta.total)
        }
      } catch (err) {
        if (seq === requestSeq.current) {
          console.error('Failed to fetch exercises', err)
        }
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false)
        }
      }
    },
    []
  )

  // Trigger search on filter / search term changes
  useEffect(() => {
    void fetchExercises(search, bodyPartId, targetMuscleId, equipmentId)
  }, [search, bodyPartId, targetMuscleId, equipmentId, fetchExercises])

  // Load more pages
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const res = await workoutService.getExercises({
        q: search.trim() || undefined,
        bodyPartId,
        targetMuscleId,
        equipmentId,
        page: nextPage,
        pageSize: 24,
      })
      setExercises((prev) => [...prev, ...res.data])
      setPage(res.meta.page)
      setTotalPages(res.meta.totalPages)
      setTotalCount(res.meta.total)
    } catch (err) {
      console.error('Failed to load more exercises', err)
    } finally {
      setLoadingMore(false)
    }
  }, [bodyPartId, equipmentId, loadingMore, page, search, targetMuscleId, totalPages])

  const activeFilterCount = [bodyPartId, targetMuscleId, equipmentId].filter(
    (v) => v !== undefined
  ).length

  const effectiveSelectedId = selectedExercise?.exerciseId ?? selectedExerciseId

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search & Filter Toolbar */}
      <SearchToolbar
        variant="plain"
        layout="row"
        value={search}
        onChange={setSearch}
        debounceMs={300}
        loading={loading}
        placeholder={t('plans.builder.exerciseModal.searchPlaceholder', {
          defaultValue: 'Tìm theo tên bài tập...',
        })}
        filters={
          <ExerciseFilterDropdown
            open={filterOpen}
            onOpenChange={(open) => {
              if (open) {
                setDraftBodyPartId(bodyPartId)
                setDraftTargetMuscleId(targetMuscleId)
                setDraftEquipmentId(equipmentId)
                setFilterOpen(true)
              } else {
                setFilterOpen(false)
              }
            }}
            activeCount={activeFilterCount}
            bodyPartId={draftBodyPartId}
            targetMuscleId={draftTargetMuscleId}
            equipmentId={draftEquipmentId}
            bodyParts={bodyParts}
            muscles={muscles}
            equipments={equipments}
            onChange={(fields) => {
              if ('bodyPartId' in fields) setDraftBodyPartId(fields.bodyPartId)
              if ('targetMuscleId' in fields) setDraftTargetMuscleId(fields.targetMuscleId)
              if ('equipmentId' in fields) setDraftEquipmentId(fields.equipmentId)
            }}
            onApply={() => {
              setBodyPartId(draftBodyPartId)
              setTargetMuscleId(draftTargetMuscleId)
              setEquipmentId(draftEquipmentId)
              setFilterOpen(false)
            }}
          />
        }
      />

      {/* Result Count Info */}
      <div className="flex items-center justify-between px-1 text-xs rogym-text-dim">
        <span>
          {loading
            ? t('plans.builder.exerciseModal.loading', { defaultValue: 'Đang tải bài tập...' })
            : t('plans.builder.exerciseModal.resultsCount', {
                defaultValue: 'Hiển thị {{count}} / {{total}} bài tập',
                count: exercises.length,
                total: totalCount,
              })}
        </span>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setBodyPartId(undefined)
              setTargetMuscleId(undefined)
              setEquipmentId(undefined)
            }}
            className="text-xs text-[var(--rogym-teal)] hover:underline"
          >
            {t('button.clearFilter', { defaultValue: 'Xóa bộ lọc' })}
          </button>
        )}
      </div>

      {/* Scrollable Exercise List */}
      <div
        className={cn(
          'space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2',
          listMaxHeight
        )}
      >
        {loading && exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs rogym-text-dim">
            <Loader2 className="mb-2 h-5 w-5 animate-spin text-[var(--rogym-teal)]" />
            <p>{t('plans.builder.exerciseModal.loading', { defaultValue: 'Đang tải bài tập...' })}</p>
          </div>
        ) : exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs rogym-text-dim">
            <Dumbbell className="mb-2 h-7 w-7 opacity-40" />
            <p>
              {t('plans.builder.exerciseModal.notFound', {
                defaultValue: 'Không tìm thấy bài tập phù hợp',
              })}
            </p>
          </div>
        ) : (
          <>
            {exercises.map((item) => {
              const isSelected = effectiveSelectedId === item.exerciseId
              const mediaSrc = item.gifUrl || item.imageUrl

              return (
                <button
                  key={item.exerciseId}
                  type="button"
                  onClick={() => onSelectExercise(item)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors duration-150',
                    isSelected
                      ? 'border border-[var(--rogym-teal)]/60 bg-[var(--rogym-teal)]/15 text-white shadow-sm'
                      : 'border border-transparent text-white/90 hover:border-white/10 hover:bg-white/[0.05]'
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
                    {mediaSrc ? (
                      <img
                        src={mediaSrc}
                        alt={item.name}
                        className="h-full w-full object-contain bg-white p-0.5"
                        loading="lazy"
                      />
                    ) : (
                      <Dumbbell size={18} className="rogym-text-dim" />
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-xs font-semibold capitalize',
                        isSelected ? 'text-[var(--rogym-teal)]' : 'text-white'
                      )}
                    >
                      {item.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] rogym-text-dim">
                      <span>{item.targetMuscle?.name ?? item.bodyPart?.name ?? '—'}</span>
                      {item.equipment?.name && <span> · {item.equipment.name}</span>}
                    </p>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="flex shrink-0 items-center gap-1 text-[var(--rogym-teal)]">
                      <Check size={16} />
                    </div>
                  )}
                </button>
              )
            })}

            {/* Load More Button */}
            {page < totalPages && (
              <div className="pt-2 text-center">
                <Button
                  type="button"
                  variant="outline-white"
                  size="sm"
                  fullWidth
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                  className="text-xs"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      {t('plans.builder.exerciseModal.loading', {
                        defaultValue: 'Đang tải thêm...',
                      })}
                    </>
                  ) : (
                    t('plans.builder.exerciseModal.loadMore', {
                      defaultValue: 'Tải thêm bài tập',
                    })
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Selected Exercise Preview */}
      {showPreview && selectedExercise && (
        <div className="flex items-center gap-3.5 rounded-xl border border-[var(--rogym-teal)]/30 bg-[var(--rogym-teal)]/[0.04] p-3 text-xs">
          {selectedExercise.gifUrl || selectedExercise.imageUrl ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white p-1 flex items-center justify-center border border-white/10">
              <img
                src={selectedExercise.gifUrl || selectedExercise.imageUrl || ''}
                alt={selectedExercise.name}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
              <Dumbbell size={24} className="rogym-text-dim" />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-white truncate">{selectedExercise.name}</p>
              <span className="shrink-0 rounded-md bg-[var(--rogym-teal)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--rogym-teal)]">
                {t('plans.builder.exerciseModal.selected', { defaultValue: 'Đã chọn' })}
              </span>
            </div>
            <p className="text-[11px] rogym-text-dim">
              {selectedExercise.targetMuscle?.name ?? '—'} ·{' '}
              {selectedExercise.bodyPart?.name ?? '—'} ·{' '}
              {selectedExercise.equipment?.name ?? t('workout.exercises.equipmentNone', { defaultValue: 'Không thiết bị' })}
            </p>
            {selectedExercise.description && (
              <p className="line-clamp-2 text-[11px] text-white/70">
                {selectedExercise.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
})
