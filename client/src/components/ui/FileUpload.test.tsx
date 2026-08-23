import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FileUpload } from './FileUpload'

describe('FileUpload Component', () => {
  it('renders dropzone placeholder and helper text', () => {
    render(
      <FileUpload
        placeholder="Tải lên tài liệu"
        helperText="Hỗ trợ PDF, PNG (tối đa 5MB)"
      />
    )

    expect(screen.getByText('Tải lên tài liệu')).toBeInTheDocument()
    expect(screen.getByText('Hỗ trợ PDF, PNG (tối đa 5MB)')).toBeInTheDocument()
  })

  it('renders file preview when value is a string URL', () => {
    render(
      <FileUpload
        value="https://example.com/avatar.jpg"
        variant="avatar"
      />
    )

    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('handles file selection via input change', () => {
    const handleChange = vi.fn()
    const { container } = render(<FileUpload onChange={handleChange} />)

    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })
    expect(handleChange).toHaveBeenCalledWith(file)
  })
})
