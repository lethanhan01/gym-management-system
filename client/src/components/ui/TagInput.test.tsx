import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TagInput } from './TagInput'

describe('TagInput Component', () => {
  it('renders default tags and placeholder', () => {
    render(<TagInput defaultValue={['Cardio', 'Tăng cơ']} placeholder="Thêm thẻ..." />)

    expect(screen.getByText('Cardio')).toBeInTheDocument()
    expect(screen.getByText('Tăng cơ')).toBeInTheDocument()
  })

  it('adds a new tag on Enter key', () => {
    const handleChange = vi.fn()
    render(<TagInput defaultValue={['Cardio']} onChange={handleChange} placeholder="Thêm thẻ..." />)

    const input = screen.getByPlaceholderText('')
    fireEvent.change(input, { target: { value: 'Giảm mỡ' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(handleChange).toHaveBeenCalledWith(['Cardio', 'Giảm mỡ'])
    expect(screen.getByText('Giảm mỡ')).toBeInTheDocument()
  })

  it('removes tag on click remove button', () => {
    const handleChange = vi.fn()
    render(<TagInput defaultValue={['Cardio', 'Yoga']} onChange={handleChange} />)

    const removeBtns = screen.getAllByRole('button', { name: /xóa/i })
    fireEvent.click(removeBtns[0])

    expect(handleChange).toHaveBeenCalledWith(['Yoga'])
  })

  it('does not allow duplicates when allowDuplicates is false', () => {
    const handleChange = vi.fn()
    render(<TagInput defaultValue={['Cardio']} onChange={handleChange} allowDuplicates={false} />)

    const input = screen.getByPlaceholderText('')
    fireEvent.change(input, { target: { value: 'Cardio' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(handleChange).not.toHaveBeenCalled()
  })
})
