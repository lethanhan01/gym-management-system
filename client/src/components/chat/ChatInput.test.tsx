import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ChatInput } from './ChatInput'

describe('ChatInput Component', () => {
  const defaultProps = {
    conversationId: '100',
    onSendMessage: vi.fn().mockResolvedValue(undefined),
    onSendImage: vi.fn().mockResolvedValue(undefined),
    onTyping: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost:3000/preview-img')
    window.URL.revokeObjectURL = vi.fn()
  })

  it('renders input elements correctly', () => {
    render(<ChatInput {...defaultProps} />)

    expect(screen.getByPlaceholderText(/nhập tin nhắn/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/đính kèm hình ảnh/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/chọn biểu tượng cảm xúc/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gửi/i)).toBeInTheDocument()
  })

  it('handles typing and triggers onTyping callback', async () => {
    const user = userEvent.setup()
    render(<ChatInput {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/nhập tin nhắn/i)
    await user.type(textarea, 'Chào Huấn luyện viên')

    expect(defaultProps.onTyping).toHaveBeenCalledWith(true)
    expect(textarea).toHaveValue('Chào Huấn luyện viên')
  })

  it('sends message on Enter keypress and clears input', async () => {
    const user = userEvent.setup()
    render(<ChatInput {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/nhập tin nhắn/i)
    await user.type(textarea, 'Chào PT{Enter}')

    await waitFor(() => {
      expect(defaultProps.onSendMessage).toHaveBeenCalledWith('Chào PT')
      expect(textarea).toHaveValue('')
    })
  })

  it('does not send message on Shift+Enter (allows newline)', async () => {
    const user = userEvent.setup()
    render(<ChatInput {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/nhập tin nhắn/i)
    await user.type(textarea, 'Dòng 1{Shift>}{Enter}{/Shift}Dòng 2')

    expect(defaultProps.onSendMessage).not.toHaveBeenCalled()
    expect(textarea).toHaveValue('Dòng 1\nDòng 2')
  })

  it('handles image file selection and sending', async () => {
    const user = userEvent.setup()
    render(<ChatInput {...defaultProps} />)

    const file = new File(['dummy-content'], 'form-tap.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, file)

    expect(screen.getByText('form-tap.png')).toBeInTheDocument()

    const sendBtn = screen.getByLabelText(/gửi/i)
    await user.click(sendBtn)

    await waitFor(() => {
      expect(defaultProps.onSendImage).toHaveBeenCalledWith(file)
    })
  })

  it('cancels image selection when remove button (X) is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatInput {...defaultProps} />)

    const file = new File(['dummy-content'], 'form-tap.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(fileInput, file)
    expect(screen.getByText('form-tap.png')).toBeInTheDocument()

    const removeBtn = screen.getByLabelText(/xóa ảnh/i)
    await user.click(removeBtn)

    expect(screen.queryByText('form-tap.png')).not.toBeInTheDocument()
  })

  it('disables input and actions when disabled prop is true', () => {
    render(<ChatInput {...defaultProps} disabled={true} />)

    const textarea = screen.getByPlaceholderText(/nhập tin nhắn/i)
    expect(textarea).toBeDisabled()
    expect(screen.getByLabelText(/đính kèm hình ảnh/i)).toBeDisabled()
    expect(screen.getByLabelText(/chọn biểu tượng cảm xúc/i)).toBeDisabled()
    expect(screen.getByLabelText(/gửi/i)).toBeDisabled()
  })
})
