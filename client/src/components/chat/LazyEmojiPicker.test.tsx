import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LazyEmojiPicker } from './LazyEmojiPicker'

vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }: { onEmojiClick: (data: { emoji: string; unified: string }) => void }) => (
    <div data-testid="mock-emoji-picker">
      <button
        type="button"
        onClick={() =>
          onEmojiClick({
            emoji: '💪',
            unified: '1f4aa',
          })
        }
      >
        Pick Muscle
      </button>
    </div>
  ),
}))

describe('LazyEmojiPicker Component', () => {
  it('TC-EP-01: renders the lazy emoji picker and handles emoji selection', async () => {
    const handleEmojiClick = vi.fn()
    const user = userEvent.setup()

    render(<LazyEmojiPicker onEmojiClick={handleEmojiClick} />)

    // Wait for the lazy component to resolve
    const mockPicker = await waitFor(() => screen.getByTestId('mock-emoji-picker'))
    expect(mockPicker).toBeInTheDocument()

    const pickButton = screen.getByRole('button', { name: /pick muscle/i })
    await user.click(pickButton)

    expect(handleEmojiClick).toHaveBeenCalledWith({
      emoji: '💪',
      unified: '1f4aa',
    })
  })
})
