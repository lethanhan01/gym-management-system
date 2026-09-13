import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  Chip,
  FormField,
  Page,
  PageHeader,
  PageSkeleton,
  SegmentedControl,
  Select,
  Switch,
  Textarea,
} from '@/components/ui'
import {
  CheckCircle2,
  Users,
  Building2,
  Star,
  EyeOff,
  ImagePlus,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import {
  feedbackService,
  type FeedbackOptions,
  type FeedbackTrainerOption,
  type FeedbackRoomOption,
  type FeedbackEquipmentOption,
  type FeedbackSessionOption,
} from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'

type FeedbackTarget = 'staff' | 'facility'

export default function SendFeedbackPage() {
  const { t } = useTranslation('member')
  const user = useAuthStore((state) => state.user)

  // Options from server
  const [options, setOptions] = useState<FeedbackOptions | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Form state
  const [targetType, setTargetType] = useState<FeedbackTarget>('staff')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [trainerScope, setTrainerScope] = useState<'assigned' | 'all'>('assigned')

  // Rating & tags
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [images, setImages] = useState<string[]>([])

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load lookup options
  useEffect(() => {
    feedbackService
      .getOptions()
      .then((data) => {
        setOptions(data)
        if (data.trainers.assigned.length > 0) {
          setSelectedStaffId(data.trainers.assigned[0].staffId)
        } else if (data.trainers.all.length > 0) {
          setTrainerScope('all')
          setSelectedStaffId(data.trainers.all[0].staffId)
        }
        if (data.rooms.length > 0) {
          setSelectedRoomId(data.rooms[0].roomId)
        }
      })
      .catch(() => {
        // Fallback gracefully
      })
      .finally(() => setLoadingOptions(false))
  }, [])

  // Dynamic tags pool based on rating & target
  const isPositive = rating >= 4
  const availableTags = options?.quickTags
    ? targetType === 'staff'
      ? isPositive
        ? options.quickTags.staff.positive
        : options.quickTags.staff.negative
      : isPositive
        ? options.quickTags.facility.positive
        : options.quickTags.facility.negative
    : []

  // Current trainers list depending on scope
  const currentTrainers: FeedbackTrainerOption[] =
    trainerScope === 'assigned' && options?.trainers.assigned && options.trainers.assigned.length > 0
      ? options.trainers.assigned
      : options?.trainers.all ?? []

  // Filter equipment for selected room
  const availableEquipment: FeedbackEquipmentOption[] =
    options?.equipment.filter((e) => !selectedRoomId || e.roomId === selectedRoomId) ?? []

  // Filter sessions for selected trainer
  const availableSessions: FeedbackSessionOption[] =
    options?.recentSessions.filter(
      (s) => !selectedStaffId || s.trainerStaffId === selectedStaffId
    ) ?? []

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remainingSlots = 3 - images.length
    const filesToProcess = Array.from(files).slice(0, remainingSlots)

    filesToProcess.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => (prev.length < 3 ? [...prev, event.target!.result as string] : prev))
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) {
      setError(t('feedback.send.errorEmpty'))
      return
    }
    if (targetType === 'staff' && !selectedStaffId) {
      setError(t('feedback.send.errorTrainerRequired'))
      return
    }
    if (targetType === 'facility' && !selectedRoomId) {
      setError(t('feedback.send.errorRoomRequired'))
      return
    }
    if (!user?.memberId) return

    setSubmitting(true)
    setError(null)

    try {
      await feedbackService.create({
        memberId: String(user.memberId),
        feedbackType: targetType,
        content: content.trim(),
        rating,
        tags: selectedTags,
        isAnonymous,
        imageUrls: images,
        subjectStaffId: targetType === 'staff' ? selectedStaffId : undefined,
        subjectRoomId: targetType === 'facility' ? selectedRoomId : undefined,
        subjectEquipmentId:
          targetType === 'facility' && selectedEquipmentId ? selectedEquipmentId : undefined,
        sessionId: targetType === 'staff' && selectedSessionId ? selectedSessionId : undefined,
      })
      setSuccess(true)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message || t('feedback.send.errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  const RATING_DESCRIPTIONS: Record<number, string> = {
    1: t('feedback.send.ratingDesc1'),
    2: t('feedback.send.ratingDesc2'),
    3: t('feedback.send.ratingDesc3'),
    4: t('feedback.send.ratingDesc4'),
    5: t('feedback.send.ratingDesc5'),
  }

  return (
    <Page>
      <PageHeader
        eyebrow={t('feedback.send.eyebrow')}
        title={t('feedback.send.title')}
        description={t('feedback.send.description')}
        actions={
          <ButtonLink variant="outline-white" size="sm" to="/member/feedback">
            {t('feedback.send.backLink')}
          </ButtonLink>
        }
      />

      <div className="max-w-2xl mx-auto">
        {loadingOptions ? (
          <PageSkeleton rows={5} />
        ) : success ? (
          <Card as="article" variant="compact" padding="md" className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-8 ring-emerald-500/10">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('feedback.send.successTitle')}</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-md">
              {t('feedback.send.successDesc')}
            </p>
            <footer className="mt-8 flex flex-col sm:flex-row gap-3 justify-center w-full max-w-xs sm:max-w-none">
              <ButtonLink variant="primary" to="/member/feedback" size="sm" className="w-full sm:w-auto">
                {t('feedback.send.buttonViewMy')}
              </ButtonLink>
              <Button
                variant="outline-white"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSuccess(false)
                  setContent('')
                  setSelectedTags([])
                  setImages([])
                  setRating(5)
                  setIsAnonymous(false)
                }}
              >
                {t('feedback.send.buttonSendAnother')}
              </Button>
            </footer>
          </Card>
        ) : (
          <Card as="article" variant="compact" padding="md">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Target Selector - Responsive 2-Column Selectable Cards */}
              <FormField label={t('feedback.send.sectionType')} required>
                <div
                  role="radiogroup"
                  aria-label={t('feedback.send.sectionType')}
                  className="grid grid-cols-2 gap-3"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={targetType === 'staff'}
                    aria-label={t('feedback.send.tabStaff')}
                    onClick={() => {
                      setTargetType('staff')
                      setSelectedTags([])
                    }}
                    className={cn(
                      'group relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border text-center transition-all duration-150 touch-manipulation active:scale-[0.98]',
                      targetType === 'staff'
                        ? 'border-[var(--rogym-teal)] bg-[var(--rogym-teal)]/[0.08] text-white shadow-[0_0_15px_rgba(6,195,132,0.15)]'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] text-white/70 hover:text-white'
                    )}
                  >
                    <div
                      className={cn(
                        'mb-2 flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                        targetType === 'staff'
                          ? 'bg-[var(--rogym-teal)] text-[var(--rogym-green-dark)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                          : 'bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white'
                      )}
                    >
                      <Users size={20} />
                    </div>
                    <span className="font-semibold text-sm leading-tight text-white line-clamp-1">
                      {t('feedback.send.tabStaffShort', t('feedback.send.tabStaff'))}
                    </span>
                    <span className="mt-1 text-[11px] text-white/50 line-clamp-1 hidden sm:block">
                      {t('feedback.send.tabStaffDesc', '')}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={targetType === 'facility'}
                    aria-label={t('feedback.send.tabFacility')}
                    onClick={() => {
                      setTargetType('facility')
                      setSelectedTags([])
                    }}
                    className={cn(
                      'group relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border text-center transition-all duration-150 touch-manipulation active:scale-[0.98]',
                      targetType === 'facility'
                        ? 'border-[var(--rogym-teal)] bg-[var(--rogym-teal)]/[0.08] text-white shadow-[0_0_15px_rgba(6,195,132,0.15)]'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] text-white/70 hover:text-white'
                    )}
                  >
                    <div
                      className={cn(
                        'mb-2 flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                        targetType === 'facility'
                          ? 'bg-[var(--rogym-teal)] text-[var(--rogym-green-dark)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                          : 'bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white'
                      )}
                    >
                      <Building2 size={20} />
                    </div>
                    <span className="font-semibold text-sm leading-tight text-white line-clamp-1">
                      {t('feedback.send.tabFacilityShort', t('feedback.send.tabFacility'))}
                    </span>
                    <span className="mt-1 text-[11px] text-white/50 line-clamp-1 hidden sm:block">
                      {t('feedback.send.tabFacilityDesc', '')}
                    </span>
                  </button>
                </div>
              </FormField>

              {/* 2. Target Specific Controls */}
              {targetType === 'staff' ? (
                <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-5">
                  {/* Trainer Scope Selector (if recent trainers exist) */}
                  {options?.trainers.assigned && options.trainers.assigned.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                        {t('feedback.send.selectTrainer')}
                      </span>
                      <SegmentedControl
                        size="sm"
                        fullWidth
                        value={trainerScope}
                        onValueChange={(val) => {
                          const scope = val as 'assigned' | 'all'
                          setTrainerScope(scope)
                          const list =
                            scope === 'assigned' ? options.trainers.assigned : options.trainers.all
                          if (list.length > 0) {
                            setSelectedStaffId(list[0].staffId)
                            setSelectedSessionId('')
                          }
                        }}
                        options={[
                          {
                            value: 'assigned',
                            label: (
                              <span className="truncate">
                                <span className="sm:hidden">{t('feedback.send.assignedTrainerShort', 'Gần đây')}</span>
                                <span className="hidden sm:inline">{t('feedback.send.assignedTrainer')}</span>
                              </span>
                            ),
                            count: options.trainers.assigned.length,
                          },
                          {
                            value: 'all',
                            label: (
                              <span className="truncate">
                                <span className="sm:hidden">{t('feedback.send.allTrainerShort', 'Tất cả')}</span>
                                <span className="hidden sm:inline">{t('feedback.send.allTrainer')}</span>
                              </span>
                            ),
                            count: options.trainers.all.length,
                          },
                        ]}
                      />
                    </div>
                  )}

                  {/* Trainer Select Dropdown */}
                  <FormField
                    label={
                      options?.trainers.assigned && options.trainers.assigned.length > 0
                        ? undefined
                        : t('feedback.send.selectTrainer')
                    }
                    required
                  >
                    <Select
                      value={selectedStaffId}
                      onValueChange={(val) => {
                        setSelectedStaffId(val)
                        setSelectedSessionId('')
                      }}
                      required
                    >
                      <option value="">-- {t('feedback.send.selectTrainer')} --</option>
                      {currentTrainers.map((tr) => (
                        <option key={tr.staffId} value={tr.staffId}>
                          {tr.fullName} ({tr.staffCode})
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  {/* Session Select Dropdown */}
                  {availableSessions.length > 0 && (
                    <FormField
                      label={t('feedback.send.selectSession')}
                      hint={t('feedback.send.selectSessionHint')}
                    >
                      <Select
                        value={selectedSessionId}
                        onValueChange={setSelectedSessionId}
                      >
                        <option value="">-- {t('feedback.send.noSessionSelected')} --</option>
                        {availableSessions.map((s) => (
                          <option key={s.sessionId} value={s.sessionId}>
                            {new Date(s.startTime).toLocaleDateString('vi-VN')} ({s.roomName})
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  )}
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-5">
                  {/* Room Select Dropdown */}
                  <FormField label={t('feedback.send.selectRoom')} required>
                    <Select
                      value={selectedRoomId}
                      onValueChange={(val) => {
                        setSelectedRoomId(val)
                        setSelectedEquipmentId('')
                      }}
                      required
                    >
                      <option value="">-- {t('feedback.send.selectRoom')} --</option>
                      {options?.rooms.map((rm: FeedbackRoomOption) => (
                        <option key={rm.roomId} value={rm.roomId}>
                          {rm.name} {rm.roomType ? `(${rm.roomType})` : ''}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  {/* Equipment Select Dropdown */}
                  {availableEquipment.length > 0 && (
                    <FormField
                      label={t('feedback.send.selectEquipment')}
                      hint={t('feedback.send.selectEquipmentHint')}
                    >
                      <Select
                        value={selectedEquipmentId}
                        onValueChange={setSelectedEquipmentId}
                      >
                        <option value="">-- {t('feedback.send.allRoomEquipment')} --</option>
                        {availableEquipment.map((eq: FeedbackEquipmentOption) => (
                          <option key={eq.equipmentId} value={eq.equipmentId}>
                            {eq.name} ({eq.equipmentCode})
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  )}
                </div>
              )}

              {/* 3. Interactive Star Rating */}
              <FormField label={t('feedback.send.ratingTitle')} required>
                <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (hoverRating || rating)
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setRating(star)
                            setSelectedTags([])
                          }}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 sm:p-1.5 transition-transform hover:scale-110 active:scale-95 focus:outline-none touch-manipulation"
                          aria-label={`${star} sao`}
                        >
                          <Star
                            className={cn(
                              'w-7 h-7 sm:w-9 sm:h-9 transition-colors duration-150',
                              active
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                                : 'fill-transparent text-slate-600 hover:text-slate-500'
                            )}
                          />
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 font-semibold text-xs sm:text-sm">
                    {rating >= 4 ? (
                      <Sparkles size={16} className="text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    )}
                    <span className={rating >= 4 ? 'text-emerald-400' : 'text-amber-300'}>
                      {RATING_DESCRIPTIONS[rating]}
                    </span>
                  </div>
                </div>
              </FormField>

              {/* 4. Dynamic Quick Tags with Chip */}
              {availableTags.length > 0 && (
                <FormField label={t('feedback.send.quickTagsTitle')}>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {availableTags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="md"
                        tone={isPositive ? 'accent' : 'warning'}
                        selected={selectedTags.includes(tag)}
                        onClick={() => toggleTag(tag)}
                      />
                    ))}
                  </div>
                </FormField>
              )}

              {/* 5. Detailed Comments with FormField + Textarea */}
              <FormField label={t('feedback.send.sectionContent')} required>
                <Textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('feedback.send.contentPlaceholder')}
                  required
                />
              </FormField>

              {/* 6. Photo Attachments */}
              <FormField label={t('feedback.send.uploadTitle')} hint={t('feedback.send.uploadHint')}>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="relative group aspect-square sm:aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40"
                    >
                      <img
                        src={imgUrl}
                        alt="attachment preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                        title={t('feedback.send.removeImage')}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {images.length < 3 && (
                    <label className="flex flex-col items-center justify-center aspect-square sm:aspect-video rounded-xl border-2 border-dashed border-white/15 hover:border-[var(--rogym-teal)]/50 bg-white/[0.02] hover:bg-[var(--rogym-teal)]/[0.03] cursor-pointer transition-all text-slate-400 hover:text-[var(--rogym-teal)] p-2">
                      <ImagePlus size={22} className="mb-1 shrink-0" />
                      <span className="text-xs font-medium text-center px-1 truncate max-w-full">
                        {t('feedback.send.uploadAdd', 'Thêm ảnh')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </FormField>

              {/* 7. Anonymous Toggle with RoGym Switch */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
                <Switch
                  id="anonymousSwitch"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  label={
                    <span className="flex items-center gap-1.5 font-semibold text-white text-sm">
                      <EyeOff size={15} className="text-slate-400 shrink-0" />
                      {t('feedback.send.anonymousLabel')}
                    </span>
                  }
                  description={t('feedback.send.anonymousDesc')}
                  switchSize="md"
                />
              </div>

              {error && <Alert tone="error" description={error} />}

              {/* 8. Submit Button */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                type="submit"
                disabled={submitting}
                loading={submitting}
                className="min-h-[48px] text-base font-semibold"
              >
                {t('feedback.send.buttonSubmit')}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </Page>
  )
}
