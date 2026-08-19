import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dumbbell } from 'lucide-react'
import {
  Button,
  Modal,
  Page,
  PageEmptyState,
  PageErrorState,
  PageHeader,
  PageSkeleton,
  SearchToolbar,
} from '@/components/ui'
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
    <Page>
      <PageHeader
        eyebrow={t('workout.exercises.eyebrow')}
        title={t('workout.exercises.pageTitle')}
        description={t('workout.exercises.description')}
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/member/workout/builder')}
            leftIcon={<Dumbbell size={15} />}
          >
            {t('workout.exercises.buttonOpenBuilder')}
          </Button>
        }
      />

      <main className="space-y-6">
        {/* Search + filter */}
        <SearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={t('workout.exercises.searchPlaceholder')}
          layout="row"
          filters={
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
          }
        />

        {error && <PageErrorState message={error} onRetry={load} />}

        {loading ? (
          <PageSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <PageEmptyState
            title={t('workout.exercises.emptyTitle')}
            description={t('workout.exercises.emptyDescription')}
          />
        ) : (
          <section aria-label={t('workout.exercises.pageTitle')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((exercise) => (
              <ExerciseCard
                key={exercise.exerciseId}
                exercise={exercise}
                onClick={() => setDetail(exercise)}
              />
            ))}
          </section>
        )}
      </main>


      {/* Detail modal */}
      {detail && (
        <Modal
          open={!!detail}
          onClose={() => setDetail(null)}
          title={detail.name}
          size="lg"
          footer={
            <>
              <Button
                variant="outline-white"
                onClick={() => setDetail(null)}
              >
                {t('workout.exercises.buttonClose')}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDetail(null)
                  navigate('/member/workout/builder')
                }}
                leftIcon={<Dumbbell size={14} />}
              >
                {t('workout.exercises.buttonAddToBuilder')}
              </Button>
            </>
          }
        >
          {detail.gifUrl && (
            <div className="aspect-[16/9] max-h-64 sm:max-h-80 w-full overflow-hidden rounded-xl mb-4 bg-white border border-white/10 p-2 sm:p-3 flex items-center justify-center">
              <img
                src={detail.gifUrl}
                alt={t('workout.exercises.imageAlt', { name: detail.name })}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
          )}
          <p className="text-xs uppercase tracking-wider rogym-sx-f27dac31 mb-2">
            {detail.targetMuscle?.name ?? '—'}
          </p>
          {detail.description && (
            <p className="text-sm leading-7 rogym-sx-d88f932f mb-4">{detail.description}</p>
          )}
          {detail.instructions && detail.instructions.length > 0 && (
            <div className="max-h-48 overflow-y-auto pr-2 mb-4">
              <p className="mb-2 text-sm font-semibold text-white">{t('workout.exercises.fieldInstructions', 'Instructions')}</p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 rogym-text-secondary">
                {detail.instructions.map((step, idx) => (
                  <li key={idx} className="pl-1">{step}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
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
        </Modal>
      )}
    </Page>
  )
}
