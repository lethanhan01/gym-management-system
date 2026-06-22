import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Search } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import workoutService, { type Exercise, type ExerciseCategory } from '@/services/workout.service'
import { ExerciseCard } from '@/components/workout/ExerciseUI'
import { getExerciseCategories, filterExercises } from '@/components/workout/exercise-data'
import {
  SubmitButton,
  TrainerEmptyState,
  TrainerErrorState,
  TrainerModal,
  TrainerPage,
  TrainerPageHeader,
  TrainerSelect,
  TrainerSkeleton,
} from '@/components/TrainerUI'

export default function ExercisesPage() {
  const { t } = useTranslation('trainer')
  const CATEGORIES = useMemo(
    () =>
      getExerciseCategories().filter(
        (item): item is { value: ExerciseCategory; label: string } => item.value !== ''
      ),
    []
  )
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [formCategory, setFormCategory] = useState<ExerciseCategory>('strength')
  const [formMuscleGroup, setFormMuscleGroup] = useState('')
  const [equipment, setEquipment] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setExercises(
        await workoutService.getExercises({
          category: category ? (category as ExerciseCategory) : undefined,
        })
      )
    } catch (err) {
      setError(getApiError(err, t('exercises.error.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [category, muscleGroup, t])

  useEffect(() => {
    void load()
  }, [load])

  const muscleGroupOptions = useMemo(() => {
    const groups = exercises
      .map((ex) => ex.muscleGroup)
      .filter((g): g is string => !!g)
    return [...new Set(groups)].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [exercises])

  const filtered = filterExercises(exercises, search).filter(
    (ex) => !muscleGroup || ex.muscleGroup === muscleGroup,
  )

  function openCreate() {
    setEditing(null)
    setName('')
    setFormCategory('strength')
    setFormMuscleGroup('')
    setEquipment('')
    setDescription('')
    setImageUrl('')
    setModalOpen(true)
  }

  function openEdit(exercise: Exercise) {
    setEditing(exercise)
    setName(exercise.name)
    setFormCategory(exercise.category)
    setFormMuscleGroup(exercise.muscleGroup ?? '')
    setEquipment(exercise.equipmentNeeded ?? '')
    setDescription(exercise.description ?? '')
    setImageUrl(exercise.imageUrl ?? '')
    setModalOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const payload = {
      name: name.trim(),
      category: formCategory,
      muscleGroup: formMuscleGroup.trim() || undefined,
      equipmentNeeded: equipment.trim() || undefined,
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    }
    try {
      if (editing) await workoutService.updateExercise(editing.exerciseId, payload)
      else await workoutService.createExercise(payload)
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(getApiError(err, t('exercises.error.saveFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow={t('exercises.eyebrow')}
        title={t('exercises.title')}
        description={t('exercises.description')}
        actions={
          <button type="button" className="rogym-btn rogym-btn--primary" onClick={openCreate}>
            <Plus size={16} /> {t('exercises.addButton')}
          </button>
        }
      />
      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_220px_220px]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim"
            size={17}
          />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('exercises.searchPlaceholder')}
          />
        </div>
        <TrainerSelect value={category} onValueChange={setCategory}>
          <option value="">{t('exercises.allCategories')}</option>
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </TrainerSelect>
        <TrainerSelect value={muscleGroup} onValueChange={setMuscleGroup}>
          <option value="">{t('exercises.allMuscleGroups')}</option>
          {muscleGroupOptions.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </TrainerSelect>
      </div>
      {error && <TrainerErrorState message={error} onRetry={load} />}
      {loading ? (
        <TrainerSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <TrainerEmptyState
          title={t('exercises.notFound')}
          description={t('exercises.notFoundDesc')}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.exerciseId}
              exercise={exercise}
              imageAspect="aspect-[6/5]"
              action={
                /^\d+$/.test(exercise.exerciseId) ? (
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                    onClick={() => openEdit(exercise)}
                    aria-label={t('exercises.editAriaLabel', { name: exercise.name })}
                  >
                    <Pencil size={15} />
                  </button>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
      <TrainerModal
        open={modalOpen}
        title={editing ? t('exercises.modal.editTitle') : t('exercises.modal.createTitle')}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setModalOpen(false)}
            >
              {t('exercises.modal.cancel')}
            </button>
            <SubmitButton form="exercise-form" loading={submitting} disabled={!name.trim()}>
              {t('exercises.modal.submit')}
            </SubmitButton>
          </>
        }
      >
        <form id="exercise-form" className="space-y-4" onSubmit={submit}>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('exercises.modal.fieldName')}</span>
            <input
              className="rogym-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={1}
              maxLength={100}
              required
              autoFocus
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('exercises.modal.fieldCategory')}</span>
            <TrainerSelect
              value={formCategory}
              onValueChange={(value) => setFormCategory(value as ExerciseCategory)}
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </TrainerSelect>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="rogym-field-label">{t('exercises.modal.fieldMuscleGroup')}</span>
              <input
                className="rogym-input"
                value={formMuscleGroup}
                onChange={(event) => setFormMuscleGroup(event.target.value)}
                maxLength={100}
              />
            </label>
            <label className="block space-y-2">
              <span className="rogym-field-label">{t('exercises.modal.fieldEquipment')}</span>
              <input
                className="rogym-input"
                value={equipment}
                onChange={(event) => setEquipment(event.target.value)}
                maxLength={100}
              />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('exercises.modal.fieldDescription')}</span>
            <textarea
              className="rogym-input min-h-28"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('exercises.modal.fieldImageUrl')}</span>
            <input
              className="rogym-input"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              maxLength={1000}
              placeholder="/exercises/squat.png"
            />
          </label>
        </form>
      </TrainerModal>
    </TrainerPage>
  )
}
