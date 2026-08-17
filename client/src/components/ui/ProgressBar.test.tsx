import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar Component', () => {
  it('renders progressbar with label and calculated percentage', () => {
    render(<ProgressBar value={75} max={100} label="Tiến độ tập luyện" showValue />)

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toBeInTheDocument()
    expect(progressbar).toHaveAttribute('aria-valuenow', '75')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    expect(screen.getByText('Tiến độ tập luyện')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('clamps value within bounds 0 and max', () => {
    render(<ProgressBar value={150} max={100} showValue />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('supports custom value formatter', () => {
    render(
      <ProgressBar
        value={3}
        max={10}
        showValue
        valueFormatter={(val, pct) => `${val}/10 buổi (${pct}%)`}
      />
    )
    expect(screen.getByText('3/10 buổi (30%)')).toBeInTheDocument()
  })

  it('supports forwardRef', () => {
    const ref = createRef<HTMLDivElement>()
    render(<ProgressBar ref={ref} value={50} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})

