import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dumbbell, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  MemberEmptyState,
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '@/components/MemberUI'
import workoutService, {
  type Exercise,
  type ExerciseBodyPart,
  type ExerciseMuscle,
  type ExerciseEquipment,
} from '@/services/workout.service'
import { getApiError } from '@/lib/api-error'
import { ExerciseCard, ExerciseFilterDropdown } from '@/components/workout/ExerciseUI'
import { filterExercises } from '@/components/workout/exercise-data'

export default function MemberExercisesPage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [bodyParts, setBodyParts] = useState<ExerciseBodyPart[]>([])
  const [muscles, setMuscles] = useState<ExerciseMuscle[]>([])
  const [equipments, setEquipments] = useState<ExerciseEquipment[]>([])

  const [search, setSearch] = useState('')
  const [bodyPartId, setBodyPartId] = useState<number | undefined>()
  const [targetMuscleId, setTargetMuscleId] = useState<number | undefined>()
  const [equipmentId, setEquipmentId] = useState<number | undefined>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Exercise | null>(null)

  // Filter popup
  const [showPopup, setShowPopup] = useState(false)
  const [draftBodyPartId, setDraftBodyPartId] = useState<number | undefined>()
  const [draftTargetMuscleId, setDraftTargetMuscleId] = useState<number | undefined>()
  const [draftEquipmentId, setDraftEquipmentId] = useState<number | undefined>()

  const loadLookups = useCallback(async () => {
    try {
      const [bp, mu, eq] = await Promise.all([
        workoutService.getBodyParts(),
        workoutService.getMuscles(),
        workoutService.getEquipments(),
      ])
      setBodyParts(bp)
      setMuscles(mu)
      setEquipments(eq)
    } catch (err) {
      console.error('Failed to load lookups', err)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await workoutService.getExercises({
        bodyPartId,
        targetMuscleId,
        equipmentId,
        q: search || undefined,
        pageSize: 100,
      })
      setExercises(result.data)
    } catch (err) {
      setError(getApiError(err, t('workout.exercises.errorLoad')))
    } finally {
      setLoading(false)
    }
  }, [bodyPartId, targetMuscleId, equipmentId, search, t])

  useEffect(() => {
    void loadLookups()
  }, [loadLookups])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = filterExercises(
    exercises,
    search,
    bodyPartId,
    targetMuscleId,
    equipmentId
  )

  const activeCount = [bodyPartId, targetMuscleId, equipmentId].filter((v) => v !== undefined).length

  function openPopup() {
    setDraftBodyPartId(bodyPartId)
    setDraftTargetMuscleId(targetMuscleId)
    setDraftEquipmentId(equipmentId)
    setShowPopup(true)
  }

  function applyFilter() {
    setBodyPartId(draftBodyPartId)
    setTargetMuscleId(draftTargetMuscleId)
    setEquipmentId(draftEquipmentId)
    setShowPopup(false)
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('workout.exercises.eyebrow')}
        title={t('workout.exercises.pageTitle')}
        description={t('workout.exercises.description')}
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => navigate('/member/workout/builder')}
          >
            <Dumbbell size={15} /> {t('workout.exercises.buttonOpenBuilder')}
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
            placeholder={t('workout.exercises.searchPlaceholder')}
          />
        </div>

        {/* Filter button + popup */}
        <ExerciseFilterDropdown
          open={showPopup}
          onOpenChange={(open) => {
            if (open) openPopup()
            else setShowPopup(false)
          }}
          activeCount={activeCount}
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
          onApply={applyFilter}
        />
      </div>

      {error && <MemberErrorState message={error} onRetry={load} />}

      {loading ? (
        <MemberSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <MemberEmptyState
          title={t('workout.exercises.emptyTitle')}
          description={t('workout.exercises.emptyDescription')}
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
                  alt={t('workout.exercises.imageAlt', { name: detail.name })}
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
                    {detail.targetMuscle?.name ?? '—'}
                  </p>
                </div>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                  onClick={() => setDetail(null)}
                  aria-label={t('workout.exercises.buttonClose')}
                >
                  <X size={16} />
                </button>
              </div>
              {detail.description && (
                <p className="mt-4 text-sm leading-7 rogym-sx-d88f932f">{detail.description}</p>
              )}
              {detail.instructions && detail.instructions.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto pr-2">
                  <p className="mb-2 text-sm font-semibold text-white">{t('workout.exercises.fieldInstructions', 'Instructions')}</p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 rogym-text-secondary">
                    {detail.instructions.map((step, idx) => (
                      <li key={idx} className="pl-1">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-xl p-3 rogym-sx-a38688f0">
                  <p className="text-xs rogym-sx-5e5c39ab">{t('workout.exercises.fieldBodyPart', 'Body Part')}</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {detail.bodyPart?.name ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl p-3 rogym-sx-a38688f0">
                  <p className="text-xs rogym-sx-5e5c39ab">{t('workout.exercises.fieldEquipment', 'Equipment')}</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {detail.equipment?.name ?? t('workout.exercises.equipmentNone')}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white flex-1 justify-center"
                  onClick={() => setDetail(null)}
                >
                  {t('workout.exercises.buttonClose')}
                </button>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary flex-1 justify-center"
                  onClick={() => {
                    setDetail(null)
                    navigate('/member/workout/builder')
                  }}
                >
                  <Dumbbell size={14} /> {t('workout.exercises.buttonAddToBuilder')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MemberPage>
  )
}
