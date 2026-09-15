import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ChatImageModal } from './ChatImageModal'

describe('ChatImageModal Component', () => {
  const mockImageUrl = 'http://localhost:3000/uploads/chat-test.png'

  beforeEach(() => {
    vi.clearAllMocks()
    window.open = vi.fn()
  })

  it('renders image modal when open is true', () => {
    render(
      <ChatImageModal
        open={true}
        imageUrl={mockImageUrl}
        altText="Ảnh bài tập"
        onClose={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const img = screen.getByRole('img', { name: /ảnh bài tập/i })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', mockImageUrl)
  })

  it('does not render when open is false or imageUrl is null', () => {
    const { rerender } = render(
      <ChatImageModal open={false} imageUrl={mockImageUrl} onClose={vi.fn()} />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(<ChatImageModal open={true} imageUrl={null} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('triggers onClose when close button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <ChatImageModal
        open={true}
        imageUrl={mockImageUrl}
        onClose={handleClose}
      />
    )

    const closeBtn = screen.getByRole('button', { name: /đóng/i })
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalled()
  })

  it('opens in new tab when "Mở tab mới" is clicked', () => {
    render(
      <ChatImageModal
        open={true}
        imageUrl={mockImageUrl}
        onClose={vi.fn()}
      />
    )

    const newTabBtn = screen.getByRole('button', { name: /mở tab mới/i })
    fireEvent.click(newTabBtn)
    expect(window.open).toHaveBeenCalledWith(mockImageUrl, '_blank')
  })
})
