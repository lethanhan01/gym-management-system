import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { PackagePicker } from './PackagePicker'
import type { Package } from '@/services/package.service'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const packages: Package[] = [
  {
    packageId: '1', packageCode: 'PKG-ONE', name: 'Strength', durationDays: 30,
    price: '600000', benefits: 'Gym access', includesPt: false, status: 'active', stats: null,
    createdAt: '2026-01-01', deletedAt: null,
  },
  {
    packageId: '2', packageCode: 'PKG-TWO', name: 'Cardio', durationDays: 60,
    price: '800000', benefits: 'PT support', includesPt: true, status: 'active', stats: null,
    createdAt: '2026-01-01', deletedAt: null,
  },
  {
    packageId: '3', packageCode: 'PKG-THREE', name: 'Recovery', durationDays: 90,
    price: '1000000', benefits: 'Recovery support', includesPt: false, status: 'active', stats: null,
    createdAt: '2026-01-01', deletedAt: null,
  },
]

type PickerProps = {
  selectedId: string
  onSelect?: (packageId: string) => void
}

function picker({ selectedId, onSelect = vi.fn() }: PickerProps) {
  return (
    <PackagePicker
      packages={packages}
      selectedId={selectedId}
      onSelect={onSelect}
      startDate={new Date('2026-01-01')}
      endDate={new Date('2026-01-30')}
      endDateLabel="End"
      onContinue={vi.fn()}
    />
  )
}

function mockGalleryGeometry({
  clientWidth = 280,
  scrollWidth = 772,
  cardWidth = 220,
}: {
  clientWidth?: number
  scrollWidth?: number
  cardWidth?: number
} = {}) {
  const gallery = screen.getByRole('list', { name: 'Thư viện gói tập' })
  const scrollTo = vi.fn()
  const cards = Array.from(gallery.querySelectorAll<HTMLElement>('.rogym-package-gallery__card'))

  Object.defineProperties(gallery, {
    clientWidth: { configurable: true, value: clientWidth },
    scrollWidth: { configurable: true, value: scrollWidth },
    scrollTo: { configurable: true, value: scrollTo },
  })
  cards.forEach((card, index) => {
    Object.defineProperties(card, {
      offsetLeft: { configurable: true, value: 32 + index * (cardWidth + 24) },
      offsetWidth: { configurable: true, value: cardWidth },
    })
  })

  return { gallery, scrollTo }
}

function getSelectButton(name: string) {
  return screen.getAllByRole('button', { name: new RegExp(name, 'i') })
    .find((button) => button.getAttribute('aria-pressed') !== null)!
}

describe('PackagePicker gallery', () => {
  it('centers the initial selected card without animation after packages become selectable', () => {
    const { rerender } = render(picker({ selectedId: '' }))
    const { scrollTo } = mockGalleryGeometry()

    rerender(picker({ selectedId: '2' }))

    expect(scrollTo).toHaveBeenCalledWith({ left: 246, behavior: 'auto' })
  })

  it('selects, centers, and shows the details for another package', () => {
    const onSelect = vi.fn()

    function ControlledPicker() {
      const [selectedId, setSelectedId] = useState('1')
      return picker({
        selectedId,
        onSelect: (packageId) => {
          onSelect(packageId)
          setSelectedId(packageId)
        },
      })
    }

    render(<ControlledPicker />)
    const { scrollTo } = mockGalleryGeometry()
    fireEvent.click(getSelectButton('Cardio'))

    expect(onSelect).toHaveBeenCalledWith('2')
    expect(scrollTo).toHaveBeenCalledWith({ left: 246, behavior: 'smooth' })
    expect(getSelectButton('Cardio')).toHaveAttribute('aria-pressed', 'true')
    expect(within(document.querySelector('.rogym-package-picker__details')!).getByText('Cardio')).toBeInTheDocument()

    scrollTo.mockClear()
    fireEvent.click(getSelectButton('Cardio'))
    expect(scrollTo).toHaveBeenCalledWith({ left: 246, behavior: 'smooth' })
  })

  it('uses instant scrolling for reduced motion and skips non-overflowing galleries', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const { rerender, unmount } = render(picker({ selectedId: '' }))
    const { scrollTo } = mockGalleryGeometry()

    rerender(picker({ selectedId: '1' }))
    scrollTo.mockClear()
    rerender(picker({ selectedId: '2' }))
    expect(scrollTo).toHaveBeenCalledWith({ left: 246, behavior: 'auto' })

    unmount()
    const nonOverflowing = render(picker({ selectedId: '' }))
    const staticGallery = mockGalleryGeometry({ clientWidth: 280, scrollWidth: 280 })
    nonOverflowing.rerender(picker({ selectedId: '1' }))
    expect(staticGallery.scrollTo).not.toHaveBeenCalled()
  })

  it('does not change selection when the gallery is scrolled or a thumbnail opens the lightbox', () => {
    const onSelect = vi.fn()
    render(picker({ selectedId: '1', onSelect }))
    const { gallery } = mockGalleryGeometry()

    fireEvent.scroll(gallery)
    fireEvent.click(screen.getByRole('button', { name: /không gian tập luyện.*Cardio/i }))

    expect(screen.getByRole('dialog')).toHaveAttribute('open')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('cycles images and closes from the backdrop', () => {
    vi.useFakeTimers()
    render(picker({ selectedId: '1' }))
    fireEvent.click(screen.getByRole('button', { name: /không gian tập luyện.*Strength/i }))

    fireEvent.click(screen.getByRole('button', { name: /Ảnh sau/i }))
    expect(screen.getByRole('dialog').querySelector('.rogym-package-lightbox__image')).toHaveAttribute(
      'alt',
      'Không gian tập luyện cho gói Cardio'
    )

    fireEvent.click(screen.getByRole('dialog'))
    vi.advanceTimersByTime(180)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes when the dialog receives Escape cancel event', () => {
    vi.useFakeTimers()
    render(picker({ selectedId: '1' }))
    fireEvent.click(screen.getByRole('button', { name: /không gian tập luyện.*Strength/i }))

    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    vi.advanceTimersByTime(180)

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
