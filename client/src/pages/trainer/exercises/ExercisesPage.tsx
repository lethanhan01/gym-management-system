import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import workoutService, { type Exercise, type ExerciseCategory } from '@/services/workout.service'
import { ExerciseCard } from '@/components/workout/ExerciseUI'
import { EXERCISE_CATEGORY_OPTIONS, filterExercises } from '@/components/workout/exercise-data'
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

const CATEGORIES = EXERCISE_CATEGORY_OPTIONS.filter(
  (item): item is { value: ExerciseCategory; label: string } => item.value !== ''
)

export default function ExercisesPage() {
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
      setError(getApiError(err, 'Không thể tải thư viện bài tập.'))
    } finally {
      setLoading(false)
    }
  }, [category, muscleGroup])

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
      setError(getApiError(err, 'Không thể lưu bài tập.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Workout"
        title="Thư viện bài tập"
        description="Quản lý các bài tập dùng chung khi xây dựng giáo án."
        actions={
          <button type="button" className="rogym-btn rogym-btn--primary" onClick={openCreate}>
            <Plus size={16} /> Thêm bài tập
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
            placeholder="Tìm theo tên, nhóm cơ hoặc dụng cụ"
          />
        </div>
        <TrainerSelect value={category} onValueChange={setCategory}>
          <option value="">Mọi loại bài tập</option>
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </TrainerSelect>
        <TrainerSelect value={muscleGroup} onValueChange={setMuscleGroup}>
          <option value="">Mọi nhóm cơ</option>
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
          title="Không tìm thấy bài tập"
          description="Thử đổi từ khóa hoặc thêm bài tập mới."
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
                    aria-label={`Sửa ${exercise.name}`}
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
        title={editing ? 'Chỉnh sửa bài tập' : 'Thêm bài tập'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setModalOpen(false)}
            >
              Hủy
            </button>
            <SubmitButton form="exercise-form" loading={submitting} disabled={!name.trim()}>
              Lưu bài tập
            </SubmitButton>
          </>
        }
      >
        <form id="exercise-form" className="space-y-4" onSubmit={submit}>
          <label className="block space-y-2">
            <span className="rogym-field-label">Tên bài tập</span>
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
            <span className="rogym-field-label">Loại bài tập</span>
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
              <span className="rogym-field-label">Nhóm cơ</span>
              <input
                className="rogym-input"
                value={formMuscleGroup}
                onChange={(event) => setFormMuscleGroup(event.target.value)}
                maxLength={100}
              />
            </label>
            <label className="block space-y-2">
              <span className="rogym-field-label">Dụng cụ</span>
              <input
                className="rogym-input"
                value={equipment}
                onChange={(event) => setEquipment(event.target.value)}
                maxLength={100}
              />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="rogym-field-label">Mô tả</span>
            <textarea
              className="rogym-input min-h-28"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Đường dẫn hình minh họa</span>
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
