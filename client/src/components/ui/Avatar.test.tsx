import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar, AvatarGroup } from './Avatar'

describe('Avatar Component', () => {
  it('generates initials from full name when image is not provided', () => {
    render(<Avatar name="Nguyễn Văn An" />)
    expect(screen.getByText('NA')).toBeInTheDocument()
  })

  it('generates initials for single-word name', () => {
    render(<Avatar name="Admin" />)
    expect(screen.getByText('AD')).toBeInTheDocument()
  })

  it('falls back to initials when image fails to load', () => {
    render(<Avatar src="https://invalid-image-url.example/test.jpg" name="Trần Bình" />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()

    fireEvent.error(img)
    expect(screen.getByText('TB')).toBeInTheDocument()
  })

  it('renders status indicator', () => {
    render(<Avatar name="Coach Mike" status="online" />)
    expect(screen.getByLabelText('Status: online')).toBeInTheDocument()
  })

  it('renders AvatarGroup with overflow count', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar name="User 1" />
        <Avatar name="User 2" />
        <Avatar name="User 3" />
        <Avatar name="User 4" />
      </AvatarGroup>
    )

    expect(screen.getByText('U1')).toBeInTheDocument()
    expect(screen.getByText('U2')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('supports forwardRef for Avatar and AvatarGroup', () => {
    const avatarRef = createRef<HTMLDivElement>()
    const groupRef = createRef<HTMLDivElement>()

    render(
      <AvatarGroup ref={groupRef}>
        <Avatar ref={avatarRef} name="Test User" />
      </AvatarGroup>
    )

    expect(avatarRef.current).toBeInstanceOf(HTMLDivElement)
    expect(groupRef.current).toBeInstanceOf(HTMLDivElement)
  })
})

