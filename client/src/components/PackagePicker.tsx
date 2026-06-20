import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Calendar, Check, CheckCircle2, UserCheck, UserX } from 'lucide-react'
import type { Package } from '@/services/package.service'
import { formatVnd } from '@/lib/currency'
import { parsePackageBenefits } from '@/lib/package'

const ITEM_HEIGHT = 84

function formatDate(value: Date) {
  return value.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function useCenteredPackagePicker(
  packages: Package[],
  selectedId: string,
  onSelect: (packageId: string) => void,
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialScroll = useRef(false)
  const isJumping = useRef(false)
  const [centerDisplayIndex, setCenterDisplayIndex] = useState(0)

  useEffect(() => {
    initialScroll.current = false
  }, [packages])

  useEffect(() => {
    if (!packages.length || !scrollRef.current || initialScroll.current) return
    const selectedIndex = packages.findIndex((item) => item.packageId === selectedId)
    const startIndex = packages.length + Math.max(selectedIndex, 0)
    scrollRef.current.scrollTop = startIndex * ITEM_HEIGHT
    setCenterDisplayIndex(startIndex)
    initialScroll.current = true
  }, [packages, selectedId])

  function selectAt(displayIndex: number, smooth = false) {
    const item = packages[((displayIndex % packages.length) + packages.length) % packages.length]
    if (item) onSelect(item.packageId)
    setCenterDisplayIndex(displayIndex)
    if (smooth) {
      scrollRef.current?.scrollTo({
        top: displayIndex * ITEM_HEIGHT,
        behavior: 'smooth',
      })
    }
  }

  function handleScroll() {
    if (!scrollRef.current || isJumping.current || !packages.length) return
    const scrollTop = scrollRef.current.scrollTop
    const displayIndex = Math.round(scrollTop / ITEM_HEIGHT)
    selectAt(displayIndex)

    if (displayIndex < packages.length) {
      isJumping.current = true
      scrollRef.current.scrollTop = scrollTop + packages.length * ITEM_HEIGHT
      requestAnimationFrame(() => {
        isJumping.current = false
      })
    } else if (displayIndex >= packages.length * 2) {
      isJumping.current = true
      scrollRef.current.scrollTop = scrollTop - packages.length * ITEM_HEIGHT
      requestAnimationFrame(() => {
        isJumping.current = false
      })
    }
  }

  return { centerDisplayIndex, handleScroll, scrollRef, selectAt }
}

export function PackagePickerSkeleton() {
  return (
    <div className="grid gap-5 rogym-sx-44a5f107" >
      {[0, 1].map((item) => (
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
  fallbackPackage,
  currentPackageId,
  startDate,
  endDate,
  endDateLabel,
  onContinue,
}: {
  packages: Package[]
  selectedId: string
  onSelect: (packageId: string) => void
  fallbackPackage?: Package | null
  currentPackageId?: string
  startDate: Date
  endDate: Date | null
  endDateLabel: string
  onContinue: () => void
}) {
  const [detailsVisible, setDetailsVisible] = useState(false)
  const selectedPackage =
    packages.find((item) => item.packageId === selectedId) ?? fallbackPackage ?? null
  const displayItems = packages.length ? [...packages, ...packages, ...packages] : []
  const benefits = parsePackageBenefits(selectedPackage?.benefits ?? null)
  const { centerDisplayIndex, handleScroll, scrollRef, selectAt } =
    useCenteredPackagePicker(packages, selectedId, onSelect)

  useEffect(() => {
    if (!selectedId) return
    setDetailsVisible(false)
    const timeout = window.setTimeout(() => setDetailsVisible(true), 20)
    return () => window.clearTimeout(timeout)
  }, [selectedId])

  return (
    <div className="rogym-package-picker flex flex-col gap-4">
      <div className="flex min-h-0 flex-1 gap-5">
        <div className="rogym-card rogym-card--compact relative flex-1 overflow-hidden">
          {packages.length ? (
            <>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="[&::-webkit-scrollbar]:hidden rogym-sx-369a0f0c"
                
              >
                <div className="rogym-package-picker__spacer" />
                {displayItems.map((item, displayIndex) => {
                  const distance = Math.abs(displayIndex - centerDisplayIndex)
                  const isSelected = distance === 0
                  const isCurrent = item.packageId === currentPackageId
                  const distanceClass = `distance-${Math.min(distance, 2)}`

                  return (
                    <div
                      key={`${displayIndex}-${item.packageId}`}
                      onClick={() => selectAt(displayIndex, true)}
                      className={`rogym-package-picker__item ${distanceClass} ${
                        isSelected ? 'is-selected' : ''
                      }`}
                    >
                      <div className="rogym-package-picker__radio flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                        {isSelected && <Check size={11} className="rogym-text-green" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="rogym-package-picker__name truncate text-white">
                            {item.name}
                          </span>
                          {isCurrent && (
                            <span className="shrink-0 rounded-full bg-[rgba(66,224,158,0.12)] px-2 py-0.5 text-[10px] rogym-text-accent">
                              Hiện tại
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs rogym-text-secondary">
                            <Calendar size={11} />
                            {item.durationDays} ngày
                          </span>
                          {item.includesPt ? (
                            <span className="flex items-center gap-1 rounded-full bg-[rgba(66,224,158,0.15)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--rogym-accent)]">
                              <UserCheck size={9} /> PT
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium rogym-text-dim">
                              <UserX size={9} /> Tự tập
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="rogym-package-picker__price shrink-0">
                        {formatVnd(item.price)}
                      </span>
                    </div>
                  )
                })}
                <div className="rogym-package-picker__spacer" />
              </div>
              <div
                className="rogym-package-picker__fade is-top pointer-events-none absolute inset-x-0 top-0 z-[2]"
              />
              <div
                className="rogym-package-picker__fade is-bottom pointer-events-none absolute inset-x-0 bottom-0 z-[2]"
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] border-y border-[rgba(6,195,132,0.18)] rogym-sx-f40d0e9c"
                
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm rogym-text-secondary">
              Không có gói nào khả dụng
            </div>
          )}
        </div>

        <div
          className={`rogym-package-picker__details rogym-card rogym-card--compact flex w-[300px] shrink-0 flex-col p-6 ${
            detailsVisible ? 'is-visible' : ''
          }`}
        >
          {selectedPackage ? (
            <>
              <div className="mb-4 border-b border-white/5 pb-4">
                <p className="mb-1 text-xs rogym-text-secondary">Gói chọn</p>
                <p className="text-base font-bold text-white">{selectedPackage.name}</p>
                <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 text-xs rogym-text-secondary">
                    <Calendar size={10} /> {selectedPackage.durationDays} ngày
                  </span>
                  {selectedPackage.includesPt ? (
                    <span className="flex items-center gap-1 rounded-full bg-[rgba(66,224,158,0.15)] px-2 py-0.5 text-xs font-medium text-[var(--rogym-accent)]">
                      <UserCheck size={11} /> Có PT
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium rogym-text-dim">
                      <UserX size={11} /> Tự tập
                    </span>
                  )}
                  <span
                    className="text-base rogym-text-green rogym-sx-d63063a8"

                  >
                    {formatVnd(selectedPackage.price)}
                  </span>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest rogym-text-secondary">
                  Quyền lợi
                </p>
                {benefits.length ? (
                  <ul className="flex flex-col gap-2.5">
                    {benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2.5 text-sm text-white/80">
                        <CheckCircle2
                          size={14}
                          className="mt-0.5 shrink-0 rogym-text-green"
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm rogym-text-dim">
                    Không có thông tin quyền lợi.
                  </p>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4">
                <div className="flex flex-col gap-1.5 text-xs rogym-text-secondary">
                  <div className="flex justify-between">
                    <span>Bắt đầu</span>
                    <span className="text-white">{formatDate(startDate)}</span>
                  </div>
                  {endDate && (
                    <div className="flex justify-between">
                      <span>{endDateLabel}</span>
                      <span className="text-white">{formatDate(endDate)}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onContinue}
                  className="rogym-btn rogym-btn--primary w-full justify-center"
                >
                  Tiếp tục <ArrowRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-center text-sm rogym-text-dim">Cuộn để chọn gói</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
