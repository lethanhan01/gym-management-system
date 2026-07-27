import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Calendar, Check, CheckCircle2, Expand, UserCheck, UserX, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Package } from '@/services/package.service'
import { formatVnd } from '@/lib/currency'
import { parsePackageBenefits } from '@/lib/package'
import { formatDate } from '@/lib/date'
import strengthImage from '@/assets/package-gallery/package-strength.jpg'
import cardioImage from '@/assets/package-gallery/package-cardio.jpg'
import trainingImage from '@/assets/package-gallery/package-training.jpg'
import recoveryImage from '@/assets/package-gallery/package-recovery.jpg'

const PACKAGE_IMAGES = [strengthImage, cardioImage, trainingImage, recoveryImage]
const CLOSE_DURATION_MS = 180
const CAROUSEL_SETTLE_DELAY_MS = 150

type CarouselScrollBehavior = 'auto' | 'smooth'

type GalleryImage = {
  src: string
  alt: string
}

function PackageImageLightbox({
  images,
  activeIndex,
  onClose,
  onPrevious,
  onNext,
}: {
  images: GalleryImage[]
  activeIndex: number | null
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (activeIndex === null || !dialog || dialog.open) return
    dialog.showModal()
  }, [activeIndex])

  function finishClose() {
    const dialog = dialogRef.current
    if (dialog?.open) {
      dialog.close()
      return
    }
    setIsClosing(false)
    onClose()
  }

  function requestClose() {
    if (activeIndex === null || isClosing) return
    setIsClosing(true)
    window.setTimeout(finishClose, CLOSE_DURATION_MS)
  }

  function handleNativeClose() {
    if (!isClosing) onClose()
    setIsClosing(false)
  }

  const image = activeIndex === null ? null : images[activeIndex]
  const displayedIndex = activeIndex ?? 0
  const { t } = useTranslation('member')

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-label={t('packagePicker.lightbox.dialogLabel')}
      className={`rogym-package-lightbox ${isClosing ? 'is-closing' : ''}`}
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onClose={handleNativeClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      {image && (
        <div className="rogym-package-lightbox__content">
          <button
            type="button"
            className="rogym-package-lightbox__close"
            aria-label={t('packagePicker.lightbox.close')}
            onClick={requestClose}
          >
            <X size={20} />
          </button>
          <button
            type="button"
            className="rogym-package-lightbox__nav is-previous"
            aria-label={t('packagePicker.lightbox.previous')}
            onClick={onPrevious}
          >
            <ArrowLeft size={22} />
          </button>
          <img key={activeIndex} src={image.src} alt={image.alt} className="rogym-package-lightbox__image" />
          <button
            type="button"
            className="rogym-package-lightbox__nav is-next"
            aria-label={t('packagePicker.lightbox.next')}
            onClick={onNext}
          >
            <ArrowRight size={22} />
          </button>
          <p className="rogym-package-lightbox__counter">
            {t('packagePicker.lightbox.counter', { current: displayedIndex + 1, total: images.length })}
          </p>
        </div>
      )}
    </dialog>
  )
}

export function PackagePickerSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="rogym-package-picker-skeleton animate-pulse rounded-2xl bg-[rgba(15,28,22,0.6)]"
        />
      ))}
    </div>
  )
}

export function PackagePicker({
  packages,
  selectedId,
  onSelect,
  currentPackageId,
  startDate,
  endDate,
  endDateLabel,
  onContinue,
}: {
  packages: Package[]
  selectedId: string
  onSelect: (packageId: string) => void
  currentPackageId?: string
  startDate: Date
  endDate: Date | null
  endDateLabel: string
  onContinue: () => void
}) {
  const { t } = useTranslation('member')
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())
  const hasInitialSelectionRef = useRef(false)
  const previousSelectedIdRef = useRef<string | null>(null)
  const pendingSelectionRef = useRef<string | null>(null)
  const scrollSettleTimeoutRef = useRef<number | null>(null)
  const selectedPackage = packages.find((item) => item.packageId === selectedId) ?? null
  const galleryImages = packages.map((item, index) => ({
    src: PACKAGE_IMAGES[index % PACKAGE_IMAGES.length],
    alt: t('packagePicker.imageAlt', { name: item.name }),
  }))
  const benefits = parsePackageBenefits(selectedPackage?.benefits ?? null)
  const galleryEntries = packages.length > 1
    ? [
        { item: packages[packages.length - 1], index: packages.length - 1, clonePosition: 'leading' as const },
        ...packages.map((item, index) => ({ item, index, clonePosition: undefined })),
        { item: packages[0], index: 0, clonePosition: 'trailing' as const },
      ]
    : packages.map((item, index) => ({ item, index, clonePosition: undefined }))

  function moveLightbox(direction: -1 | 1) {
    setActiveImageIndex((index) => {
      if (index === null || galleryImages.length === 0) return null
      return (index + direction + galleryImages.length) % galleryImages.length
    })
  }

  const centerPackage = useCallback((packageId: string, behavior: CarouselScrollBehavior) => {
    const gallery = galleryRef.current
    const card = cardRefs.current.get(packageId)
    if (!gallery || !card || gallery.scrollWidth <= gallery.clientWidth + 1) return

    const maxScrollLeft = gallery.scrollWidth - gallery.clientWidth
    const targetScrollLeft = card.offsetLeft - (gallery.clientWidth - card.offsetWidth) / 2
    gallery.scrollTo({
      left: Math.min(Math.max(targetScrollLeft, 0), maxScrollLeft),
      behavior,
    })
  }, [])

  function selectedCardBehavior(): CarouselScrollBehavior {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  }

  function handlePackageSelect(packageId: string) {
    centerPackage(packageId, selectedCardBehavior())
    if (packageId !== selectedId) pendingSelectionRef.current = packageId
    onSelect(packageId)
  }

  const settleCarousel = useCallback(() => {
    const gallery = galleryRef.current
    if (!gallery || packages.length < 2 || gallery.scrollWidth <= gallery.clientWidth + 1) return

    const viewportCenter = gallery.scrollLeft + gallery.clientWidth / 2
    const centeredCard = Array.from(gallery.querySelectorAll<HTMLElement>('[data-package-id]'))
      .reduce<HTMLElement | null>((closest, card) => {
        if (!closest) return card
        const cardDistance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - viewportCenter)
        const closestDistance = Math.abs(closest.offsetLeft + closest.offsetWidth / 2 - viewportCenter)
        return cardDistance < closestDistance ? card : closest
      }, null)
    const packageId = centeredCard?.dataset.packageId
    if (!packageId) return

    if (centeredCard.dataset.carouselClone) centerPackage(packageId, 'auto')
    if (packageId !== selectedId) {
      pendingSelectionRef.current = packageId
      onSelect(packageId)
    }
  }, [centerPackage, onSelect, packages.length, selectedId])

  function handleGalleryScroll() {
    if (scrollSettleTimeoutRef.current !== null) window.clearTimeout(scrollSettleTimeoutRef.current)
    scrollSettleTimeoutRef.current = window.setTimeout(() => {
      scrollSettleTimeoutRef.current = null
      settleCarousel()
    }, CAROUSEL_SETTLE_DELAY_MS)
  }

  useLayoutEffect(() => {
    if (!selectedId || !cardRefs.current.has(selectedId)) return

    if (!hasInitialSelectionRef.current) {
      const isInteractionInitiatedSelection = pendingSelectionRef.current === selectedId
      centerPackage(selectedId, isInteractionInitiatedSelection ? selectedCardBehavior() : 'auto')
      pendingSelectionRef.current = null
      hasInitialSelectionRef.current = true
      previousSelectedIdRef.current = selectedId
      return
    }

    if (previousSelectedIdRef.current !== selectedId) {
      if (pendingSelectionRef.current !== selectedId) {
        centerPackage(selectedId, selectedCardBehavior())
      }
      pendingSelectionRef.current = null
      previousSelectedIdRef.current = selectedId
    }
  }, [centerPackage, packages, selectedId])

  useEffect(() => {
    const gallery = galleryRef.current
    if (!gallery) return

    let wasOverflowing = gallery.scrollWidth > gallery.clientWidth + 1
    const recenterWhenCarouselAppears = () => {
      const isOverflowing = gallery.scrollWidth > gallery.clientWidth + 1
      if (isOverflowing && !wasOverflowing && selectedId) centerPackage(selectedId, 'auto')
      wasOverflowing = isOverflowing
    }

    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(recenterWhenCarouselAppears)
    observer?.observe(gallery)
    window.addEventListener('resize', recenterWhenCarouselAppears)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', recenterWhenCarouselAppears)
    }
  }, [centerPackage, selectedId])

  useEffect(() => () => {
    if (scrollSettleTimeoutRef.current !== null) window.clearTimeout(scrollSettleTimeoutRef.current)
  }, [])

  return (
    <div className="rogym-package-picker space-y-5">
      <div className="rogym-package-carousel">
        <div
          ref={galleryRef}
          className="rogym-package-gallery"
          role="list"
          aria-label={t('packagePicker.galleryLabel')}
          tabIndex={0}
          onScroll={handleGalleryScroll}
        >
          {galleryEntries.map(({ item, index, clonePosition }) => {
          const isClone = Boolean(clonePosition)
          const isSelected = item.packageId === selectedId
          const isCurrent = item.packageId === currentPackageId
          const image = galleryImages[index]

          return (
            <article
              key={clonePosition ? `${clonePosition}-${item.packageId}` : item.packageId}
              ref={isClone ? undefined : (node) => {
                if (node) cardRefs.current.set(item.packageId, node)
                else cardRefs.current.delete(item.packageId)
              }}
              className={`rogym-package-gallery__card ${isSelected ? 'is-selected' : ''} ${isClone ? 'is-carousel-clone' : ''}`}
              role="listitem"
              aria-hidden={isClone || undefined}
              data-package-id={item.packageId}
              data-carousel-clone={clonePosition}
            >
              {isClone ? (
                <>
                  <div className="rogym-package-gallery__image-button">
                    <img src={image.src} alt="" className="rogym-package-gallery__image" />
                    <span className="rogym-package-gallery__expand"><Expand size={16} /></span>
                  </div>
                  <div className="rogym-package-gallery__select">
                    <span className="rogym-package-gallery__heading">
                      <span className="min-w-0">
                        <span className="rogym-package-gallery__name">{item.name}</span>
                        <span className="rogym-package-gallery__meta"><Calendar size={12} /> {t('packagePicker.days', { count: item.durationDays })}</span>
                      </span>
                      <span className="rogym-package-gallery__price">{formatVnd(item.price)}</span>
                    </span>
                    <span className="rogym-package-gallery__badges">
                      {item.includesPt ? <span className="rogym-package-gallery__badge is-pt"><UserCheck size={11} /> {t('packagePicker.withPt')}</span> : <span className="rogym-package-gallery__badge"><UserX size={11} /> {t('packagePicker.selfTrain')}</span>}
                      {isCurrent && <span className="rogym-package-gallery__badge is-current">{t('packagePicker.currentBadge')}</span>}
                      {isSelected && <span className="rogym-package-gallery__selected"><Check size={13} /> {t('packagePicker.selected')}</span>}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <button type="button" className="rogym-package-gallery__image-button" aria-label={t('packagePicker.viewImage', { name: item.name })} onClick={() => setActiveImageIndex(index)}>
                    <img src={image.src} alt={image.alt} className="rogym-package-gallery__image" />
                    <span className="rogym-package-gallery__expand" aria-hidden="true"><Expand size={16} /></span>
                  </button>
                  <button type="button" className="rogym-package-gallery__select" aria-pressed={isSelected} onClick={() => handlePackageSelect(item.packageId)}>
                    <span className="rogym-package-gallery__heading">
                      <span className="min-w-0">
                        <span className="rogym-package-gallery__name">{item.name}</span>
                        <span className="rogym-package-gallery__meta"><Calendar size={12} /> {t('packagePicker.days', { count: item.durationDays })}</span>
                      </span>
                      <span className="rogym-package-gallery__price">{formatVnd(item.price)}</span>
                    </span>
                    <span className="rogym-package-gallery__badges">
                      {item.includesPt ? <span className="rogym-package-gallery__badge is-pt"><UserCheck size={11} /> {t('packagePicker.withPt')}</span> : <span className="rogym-package-gallery__badge"><UserX size={11} /> {t('packagePicker.selfTrain')}</span>}
                      {isCurrent && <span className="rogym-package-gallery__badge is-current">{t('packagePicker.currentBadge')}</span>}
                      {isSelected && <span className="rogym-package-gallery__selected"><Check size={13} /> {t('packagePicker.selected')}</span>}
                    </span>
                  </button>
                </>
              )}
            </article>
          )
          })}
        </div>
      </div>

      <div className="rogym-package-picker__details rogym-card rogym-card--compact p-5 sm:p-6">
        {selectedPackage ? (
          <>
            <div className="mb-4 border-b border-white/5 pb-4">
              <p className="mb-1 text-xs rogym-text-secondary">{t('packagePicker.selectedLabel')}</p>
              <p className="text-base font-bold text-white">{selectedPackage.name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 text-xs rogym-text-secondary"><Calendar size={10} /> {t('packagePicker.days', { count: selectedPackage.durationDays })}</span>
                <span className="text-base rogym-text-green rogym-sx-d63063a8">{formatVnd(selectedPackage.price)}</span>
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest rogym-text-secondary">{t('packagePicker.benefits')}</p>
              {benefits.length ? (
                <ul className="grid gap-2.5 md:grid-cols-2">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2.5 text-sm text-white/80">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 rogym-text-green" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm rogym-text-dim">{t('packagePicker.noBenefits')}</p>}
            </div>
            <div className="mt-5 flex flex-col gap-4 border-t border-white/5 pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-1.5 text-xs rogym-text-secondary">
                <div className="flex justify-between gap-8"><span>{t('packagePicker.start')}</span><span className="text-white">{formatDate(startDate)}</span></div>
                {endDate && <div className="flex justify-between gap-8"><span>{endDateLabel}</span><span className="text-white">{formatDate(endDate)}</span></div>}
              </div>
              <button type="button" onClick={onContinue} className="rogym-btn rogym-btn--primary justify-center sm:min-w-48">
                {t('packagePicker.continue')} <ArrowRight size={15} />
              </button>
            </div>
          </>
        ) : <p className="py-8 text-center text-sm rogym-text-dim">{t('packagePicker.scrollToSelect')}</p>}
      </div>

      <PackageImageLightbox
        images={galleryImages}
        activeIndex={activeImageIndex}
        onClose={() => setActiveImageIndex(null)}
        onPrevious={() => moveLightbox(-1)}
        onNext={() => moveLightbox(1)}
      />
    </div>
  )
}
