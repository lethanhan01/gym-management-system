import { create } from 'zustand'

export type WorkoutSessionControlStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'saving'
  | 'save-error'
  | 'completed'

export interface WorkoutSessionControl {
  status: WorkoutSessionControlStatus
  startTimer: () => void
  pauseTimer: () => void
  resumeTimer: () => void
  retrySave: () => void
}

interface WorkoutSessionControlState {
  controls: WorkoutSessionControl | null
  setControls: (controls: WorkoutSessionControl | null) => void
}

export const useWorkoutSessionControlStore = create<WorkoutSessionControlState>((set) => ({
  controls: null,
  setControls: (controls) => set({ controls }),
}))
