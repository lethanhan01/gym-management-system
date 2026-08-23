import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RadioGroup, RadioGroupItem, RadioCard } from './RadioGroup'

describe('RadioGroup Component', () => {
  it('renders standard radio group items', () => {
    const handleChange = vi.fn()
    render(
      <RadioGroup value="option1" onValueChange={handleChange}>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="option1" id="r1" />
          <label htmlFor="r1">Lựa chọn 1</label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="option2" id="r2" />
          <label htmlFor="r2">Lựa chọn 2</label>
        </div>
      </RadioGroup>
    )

    expect(screen.getByText('Lựa chọn 1')).toBeInTheDocument()
    expect(screen.getByText('Lựa chọn 2')).toBeInTheDocument()

    const radio2 = screen.getByRole('radio', { name: 'Lựa chọn 2' })
    fireEvent.click(radio2)
    expect(handleChange).toHaveBeenCalledWith('option2')
  })

  it('renders RadioCard with title and description', () => {
    const handleChange = vi.fn()
    render(
      <RadioGroup value="card1" onValueChange={handleChange}>
        <RadioCard
          value="card1"
          title="Gói VIP 12 Tháng"
          description="Đầy đủ tiện ích và PT cá nhân"
        />
        <RadioCard
          value="card2"
          title="Gói Standard 6 Tháng"
          description="Tập tự do không giới hạn giờ"
        />
      </RadioGroup>
    )

    expect(screen.getByText('Gói VIP 12 Tháng')).toBeInTheDocument()
    expect(screen.getByText('Đầy đủ tiện ích và PT cá nhân')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Gói Standard 6 Tháng'))
    expect(handleChange).toHaveBeenCalledWith('card2')
  })
})
