import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Search, X } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import workoutService, {
  type Exercise,
  type ExerciseBodyPart,
  type ExerciseMuscle,
  type ExerciseEquipment,
} from '@/services/workout.service'
import { ExerciseCard, ExerciseFilterDropdown } from '@/components/workout/ExerciseUI'
import { filterExercises } from '@/components/workout/exercise-data'
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
  const { t: tm } = useTranslation('member')

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [bodyParts, setBodyParts] = useState<ExerciseBodyPart[]>([])
  const [muscles, setMuscles] = useState<ExerciseMuscle[]>([])
  const [equipments, setEquipments] = useState<ExerciseEquipment[]>([])

  const [search, setSearch] = useState('')
  const [bodyPartId, setBodyPartId] = useState<number | ''>('')
  const [targetMuscleId, setTargetMuscleId] = useState<number | ''>('')
  const [equipmentId, setEquipmentId] = useState<number | ''>('')

  // Filter popup
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftBodyPartId, setDraftBodyPartId] = useState<number | ''>('')
  const [draftTargetMuscleId, setDraftTargetMuscleId] = useState<number | ''>('')
  const [draftEquipmentId, setDraftEquipmentId] = useState<number | ''>('')

  const activeCount = [bodyPartId, targetMuscleId, equipmentId].filter(v => v !== '').length

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [name, setName] = useState('')
  const [formBodyPartId, setFormBodyPartId] = useState<number | ''>('')
  const [formTargetMuscleId, setFormTargetMuscleId] = useState<number | ''>('')
  const [formEquipmentId, setFormEquipmentId] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState<string[]>([''])
  const [imageUrl, setImageUrl] = useState('')

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
        bodyPartId: bodyPartId !== '' ? bodyPartId : undefined,
        targetMuscleId: targetMuscleId !== '' ? targetMuscleId : undefined,
        equipmentId: equipmentId !== '' ? equipmentId : undefined,
        q: search || undefined,
        pageSize: 100,
      })
      setExercises(result.data)
    } catch (err) {
      setError(getApiError(err, t('exercises.error.loadFailed')))
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
    bodyPartId !== '' ? bodyPartId : undefined,
    targetMuscleId !== '' ? targetMuscleId : undefined,
    equipmentId !== '' ? equipmentId : undefined
  )

  function openCreate() {
    setEditing(null)
    setName('')
    setFormBodyPartId('')
    setFormTargetMuscleId('')
    setFormEquipmentId('')
    setDescription('')
    setInstructions([''])
    setImageUrl('')
    setModalOpen(true)
  }

  function openEdit(exercise: Exercise) {
    setEditing(exercise)
    setName(exercise.name)
    setFormBodyPartId(exercise.bodyPartId ?? '')
    setFormTargetMuscleId(exercise.targetMuscleId ?? '')
    setFormEquipmentId(exercise.equipmentId ?? '')
    setDescription(exercise.description ?? '')
    setInstructions(exercise.instructions?.length ? exercise.instructions : [''])
    setImageUrl(exercise.imageUrl ?? '')
    setModalOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const payload = {
      name: name.trim(),
      bodyPartId: formBodyPartId !== '' ? formBodyPartId : undefined,
      targetMuscleId: formTargetMuscleId !== '' ? formTargetMuscleId : undefined,
      equipmentId: formEquipmentId !== '' ? formEquipmentId : undefined,
      description: description.trim() || undefined,
      instructions: instructions.map(s => s.trim()).filter(s => s).length > 0 ? instructions.map(s => s.trim()).filter(s => s) : undefined,
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
      <div className="rogym-card rogym-card--compact flex items-center gap-3 p-4">
        <div className="relative min-w-0 flex-1">
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
          activeCount={activeCount}
          bodyPartId={draftBodyPartId !== '' ? draftBodyPartId : undefined}
          targetMuscleId={draftTargetMuscleId !== '' ? draftTargetMuscleId : undefined}
          equipmentId={draftEquipmentId !== '' ? draftEquipmentId : undefined}
          bodyParts={bodyParts}
          muscles={muscles}
          equipments={equipments}
          onChange={(fields) => {
            if ('bodyPartId' in fields) setDraftBodyPartId(fields.bodyPartId ?? '')
            if ('targetMuscleId' in fields) setDraftTargetMuscleId(fields.targetMuscleId ?? '')
            if ('equipmentId' in fields) setDraftEquipmentId(fields.equipmentId ?? '')
          }}
          onApply={() => {
            setBodyPartId(draftBodyPartId)
            setTargetMuscleId(draftTargetMuscleId)
            setEquipmentId(draftEquipmentId)
            setFilterOpen(false)
          }}
        />
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
            <span className="rogym-field-label">{tm('workout.exercises.fieldBodyPart', 'Body Part')}</span>
            <TrainerSelect
              value={String(formBodyPartId)}
              onValueChange={(val) => setFormBodyPartId(val ? Number(val) : '')}
            >
              <option value="">—</option>
              {bodyParts.map((item) => (
                <option key={item.bodyPartId} value={item.bodyPartId}>
                  {item.name}
                </option>
              ))}
            </TrainerSelect>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="rogym-field-label">{tm('workout.exercises.fieldTargetMuscle', 'Target Muscle')}</span>
              <TrainerSelect
                value={String(formTargetMuscleId)}
                onValueChange={(val) => setFormTargetMuscleId(val ? Number(val) : '')}
              >
                <option value="">—</option>
                {muscles.map((item) => (
                  <option key={item.muscleId} value={item.muscleId}>
                    {item.name}
                  </option>
                ))}
              </TrainerSelect>
            </label>
            <label className="block space-y-2">
              <span className="rogym-field-label">{tm('workout.exercises.fieldEquipment', 'Equipment')}</span>
              <TrainerSelect
                value={String(formEquipmentId)}
                onValueChange={(val) => setFormEquipmentId(val ? Number(val) : '')}
              >
                <option value="">—</option>
                {equipments.map((item) => (
                  <option key={item.equipmentId} value={item.equipmentId}>
                    {item.name}
                  </option>
                ))}
              </TrainerSelect>
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
          <div className="block space-y-2">
            <span className="rogym-field-label">{tm('workout.exercises.fieldInstructions', 'Instructions')}</span>
            <div className="space-y-2">
              {instructions.map((step, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className="rogym-input flex-1"
                    value={step}
                    onChange={(e) => {
                      const newInst = [...instructions]
                      newInst[idx] = e.target.value
                      setInstructions(newInst)
                    }}
                    placeholder={`Step ${idx + 1}`}
                  />
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--icon rogym-btn--outline-white shrink-0"
                    onClick={() => {
                      const newInst = instructions.filter((_, i) => i !== idx)
                      setInstructions(newInst)
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white mt-2 w-full justify-center text-xs"
              onClick={() => setInstructions([...instructions, ''])}
            >
              <Plus size={14} /> Add Step
            </button>
          </div>
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
