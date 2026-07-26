import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
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
  packageList?: Package[]
}

function picker({ selectedId, onSelect = vi.fn(), packageList = packages }: PickerProps) {
  return (
    <PackagePicker
      packages={packageList}
      selectedId={selectedId}
      onSelect={onSelect}
      startDate={new Date('2026-01-01')}
      endDate={new Date('2026-01-30')}
      endDateLabel="End"
      onContinue={vi.fn()}
    />
  )
}

function ControlledPicker({
  initialSelectedId,
  onSelect,
  packageList = packages,
}: {
  initialSelectedId: string
  onSelect: (packageId: string) => void
  packageList?: Package[]
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  return picker({
    selectedId,
    packageList,
    onSelect: (packageId) => {
      onSelect(packageId)
      setSelectedId(packageId)
    },
  })
}

function mockGalleryGeometry({
  clientWidth = 280,
  scrollWidth = 1260,
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
    scrollLeft: { configurable: true, value: 0, writable: true },
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

function settleScroll(gallery: HTMLElement) {
  fireEvent.scroll(gallery)
  act(() => vi.advanceTimersByTime(150))
}

describe('PackagePicker gallery', () => {
  it('centers the initial selected real card without animation after packages become selectable', () => {
    const { rerender } = render(picker({ selectedId: '' }))
    const { scrollTo } = mockGalleryGeometry()

    rerender(picker({ selectedId: '2' }))

    expect(scrollTo).toHaveBeenCalledWith({ left: 490, behavior: 'auto' })
  })

  it('renders inaccessible, non-interactive boundary clones only when multiple packages exist', () => {
    render(picker({ selectedId: '1' }))
    const gallery = screen.getByRole('list', { name: 'Thư viện gói tập' })
    const clones = gallery.querySelectorAll<HTMLElement>('[data-carousel-clone]')

    expect(clones).toHaveLength(2)
    clones.forEach((clone) => {
      expect(clone).toHaveAttribute('aria-hidden', 'true')
      expect(clone.querySelectorAll('button')).toHaveLength(0)
    })

    const onePackage = render(picker({ selectedId: '1', packageList: packages.slice(0, 1) }))
    expect(onePackage.container.querySelectorAll('[data-carousel-clone]')).toHaveLength(0)
  })

  it('selects, centers, and shows the details for another package when its button is pressed', () => {
    const onSelect = vi.fn()
    render(<ControlledPicker initialSelectedId="1" onSelect={onSelect} />)
    const { scrollTo } = mockGalleryGeometry()
    fireEvent.click(getSelectButton('Cardio'))

    expect(onSelect).toHaveBeenCalledWith('2')
    expect(scrollTo).toHaveBeenCalledWith({ left: 490, behavior: 'smooth' })
    expect(getSelectButton('Cardio')).toHaveAttribute('aria-pressed', 'true')
    expect(within(document.querySelector('.rogym-package-picker__details')!).getByText('Cardio')).toBeInTheDocument()
  })

  it('updates the selected package after the centered real card settles', () => {
    vi.useFakeTimers()
    const onSelect = vi.fn()
    render(<ControlledPicker initialSelectedId="1" onSelect={onSelect} />)
    const { gallery } = mockGalleryGeometry()
    gallery.scrollLeft = 490

    settleScroll(gallery)

    expect(onSelect).toHaveBeenCalledWith('2')
    expect(getSelectButton('Cardio')).toHaveAttribute('aria-pressed', 'true')
    expect(within(document.querySelector('.rogym-package-picker__details')!).getByText('Cardio')).toBeInTheDocument()
  })

  it('loops from a boundary clone back to its real card without selecting twice', () => {
    vi.useFakeTimers()
    const onSelect = vi.fn()
    render(<ControlledPicker initialSelectedId="3" onSelect={onSelect} />)
    const { gallery, scrollTo } = mockGalleryGeometry()

    gallery.scrollLeft = 978
    settleScroll(gallery)
    expect(scrollTo).toHaveBeenCalledWith({ left: 246, behavior: 'auto' })
    expect(onSelect).toHaveBeenCalledWith('1')

    gallery.scrollLeft = 246
    settleScroll(gallery)
    expect(onSelect).toHaveBeenCalledTimes(1)

    gallery.scrollLeft = 2
    settleScroll(gallery)
    expect(scrollTo).toHaveBeenCalledWith({ left: 734, behavior: 'auto' })
    expect(onSelect).toHaveBeenLastCalledWith('3')
  })

  it('uses instant scrolling for reduced motion and skips non-overflowing galleries', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const { rerender, unmount } = render(picker({ selectedId: '' }))
    const { scrollTo } = mockGalleryGeometry()

    rerender(picker({ selectedId: '1' }))
    scrollTo.mockClear()
    rerender(picker({ selectedId: '2' }))
    expect(scrollTo).toHaveBeenCalledWith({ left: 490, behavior: 'auto' })

    unmount()
    const nonOverflowing = render(picker({ selectedId: '' }))
    const staticGallery = mockGalleryGeometry({ clientWidth: 280, scrollWidth: 280 })
    nonOverflowing.rerender(picker({ selectedId: '1' }))
    fireEvent.scroll(staticGallery.gallery)
    expect(staticGallery.scrollTo).not.toHaveBeenCalled()
  })

  it('opens a thumbnail in the lightbox without changing the selection', () => {
    const onSelect = vi.fn()
    render(picker({ selectedId: '1', onSelect }))
    mockGalleryGeometry()

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
