import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chip } from './Chip'

describe('Chip Component', () => {
  it('renders label correctly', () => {
    render(<Chip label="Cardio" />)
    expect(screen.getByText('Cardio')).toBeInTheDocument()
  })

  it('triggers onClick when clicked as interactive chip', () => {
    const handleClick = vi.fn()
    render(<Chip label="Strength" onClick={handleClick} />)

    const chip = screen.getByText('Strength')
    fireEvent.click(chip)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders remove button and calls onRemove', () => {
    const handleRemove = vi.fn()
    render(<Chip label="Removable" removable onRemove={handleRemove} />)

    const removeBtn = screen.getByRole('button', { name: 'Xóa' })
    expect(removeBtn).toBeInTheDocument()
    fireEvent.click(removeBtn)
    expect(handleRemove).toHaveBeenCalledTimes(1)
  })
})
