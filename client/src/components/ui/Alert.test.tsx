import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Alert, AlertTitle, AlertDescription } from './Alert'

describe('Alert Component', () => {
  it('renders alert with title and description', () => {
    render(
      <Alert tone="error">
        <AlertTitle>Lỗi hệ thống</AlertTitle>
        <AlertDescription>Không thể kết nối tới server</AlertDescription>
      </Alert>
    )

    const alertEl = screen.getByRole('alert')
    expect(alertEl).toBeInTheDocument()
    expect(alertEl).toHaveAttribute('aria-live', 'assertive')
    expect(screen.getByText('Lỗi hệ thống')).toBeInTheDocument()
    expect(screen.getByText('Không thể kết nối tới server')).toBeInTheDocument()
  })

  it('triggers onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <Alert tone="warning" title="Cảnh báo" onClose={onClose} closeAriaLabel="Đóng thông báo">
        Nội dung cảnh báo
      </Alert>
    )

    expect(screen.getByText('Nội dung cảnh báo')).toBeInTheDocument()
    const closeBtn = screen.getByRole('button', { name: 'Đóng thông báo' })
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders action elements when provided', () => {
    render(
      <Alert
        tone="info"
        title="Thông báo"
        action={<button type="button">Xác nhận ngay</button>}
      />
    )

    expect(screen.getByRole('button', { name: 'Xác nhận ngay' })).toBeInTheDocument()
  })

  it('supports forwardRef for Alert, AlertTitle, and AlertDescription', () => {
    const alertRef = createRef<HTMLDivElement>()
    const titleRef = createRef<HTMLHeadingElement>()
    const descRef = createRef<HTMLParagraphElement>()

    render(
      <Alert ref={alertRef} tone="success">
        <AlertTitle ref={titleRef}>Thành công</AlertTitle>
        <AlertDescription ref={descRef}>Đã lưu dữ liệu</AlertDescription>
      </Alert>
    )

    expect(alertRef.current).toBeInstanceOf(HTMLDivElement)
    expect(titleRef.current).toBeInstanceOf(HTMLHeadingElement)
    expect(descRef.current).toBeInstanceOf(HTMLDivElement)
  })
})

