import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExerciseSearchPicker } from './ExerciseSearchPicker'
import workoutService, { type Exercise } from '@/services/workout.service'

vi.mock('@/services/workout.service', () => {
  return {
    default: {
      getBodyParts: vi.fn(),
      getMuscles: vi.fn(),
      getEquipments: vi.fn(),
      getExercises: vi.fn(),
    },
  }
})

const mockExercises: Exercise[] = [
  {
    exerciseId: '1',
    name: 'Bench Press',
    bodyPartId: 1,
    targetMuscleId: 1,
    equipmentId: 1,
    description: 'Chest barbell press',
    instructions: ['Lie down', 'Press bar'],
    gifUrl: null,
    imageUrl: null,
    createdByStaffId: null,
    createdAt: '2026-01-01',
    deletedAt: null,
    targetMuscle: { muscleId: 1, name: 'Pectorals' },
    bodyPart: { bodyPartId: 1, name: 'Chest' },
    equipment: { equipmentId: 1, name: 'Barbell' },
  },
  {
    exerciseId: '2',
    name: 'Squat',
    bodyPartId: 2,
    targetMuscleId: 2,
    equipmentId: 1,
    description: 'Barbell back squat',
    instructions: ['Stand with feet shoulder width', 'Squat down'],
    gifUrl: null,
    imageUrl: null,
    createdByStaffId: null,
    createdAt: '2026-01-01',
    deletedAt: null,
    targetMuscle: { muscleId: 2, name: 'Quadriceps' },
    bodyPart: { bodyPartId: 2, name: 'Legs' },
    equipment: { equipmentId: 1, name: 'Barbell' },
  },
]

describe('ExerciseSearchPicker Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(workoutService.getBodyParts).mockResolvedValue([
      { bodyPartId: 1, name: 'Chest' },
      { bodyPartId: 2, name: 'Legs' },
    ])
    vi.mocked(workoutService.getMuscles).mockResolvedValue([
      { muscleId: 1, name: 'Pectorals' },
      { muscleId: 2, name: 'Quadriceps' },
    ])
    vi.mocked(workoutService.getEquipments).mockResolvedValue([
      { equipmentId: 1, name: 'Barbell' },
    ])
    vi.mocked(workoutService.getExercises).mockResolvedValue({
      data: mockExercises,
      meta: { page: 1, pageSize: 24, total: 2, totalPages: 1 },
    })
  })

  it('renders search input and fetches exercises on mount', async () => {
    const onSelect = vi.fn()
    render(<ExerciseSearchPicker onSelectExercise={onSelect} />)

    await waitFor(() => {
      expect(workoutService.getExercises).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 24 })
      )
    })

    expect(await screen.findByText('Bench Press')).toBeInTheDocument()
    expect(screen.getByText('Squat')).toBeInTheDocument()
  })

  it('calls onSelectExercise when an exercise option is clicked', async () => {
    const onSelect = vi.fn()
    render(<ExerciseSearchPicker onSelectExercise={onSelect} />)

    const benchPressBtn = await screen.findByText('Bench Press')
    fireEvent.click(benchPressBtn)

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(mockExercises[0])
  })

  it('renders selected exercise preview', () => {
    const onSelect = vi.fn()
    render(
      <ExerciseSearchPicker
        selectedExercise={mockExercises[0]}
        onSelectExercise={onSelect}
        showPreview={true}
      />
    )

    // Preview shows description and muscle/equipment
    expect(screen.getByText('Chest barbell press')).toBeInTheDocument()
  })
})
