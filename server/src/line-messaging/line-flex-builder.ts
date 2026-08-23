import {
  BadgeTone,
  FLEX_BADGE_TONES,
  FLEX_THEME,
} from './line-flex-tokens'
import {
  getFlexLocales,
  LineMessageLocale,
} from './line-flex-locales'

export { LineMessageLocale }

export interface LineFlexText {
  type: 'text'
  text: string
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl'
  color?: string
  weight?: 'regular' | 'bold'
  flex?: number
  wrap?: boolean
  align?: 'start' | 'center' | 'end'
  margin?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
}

export interface LineFlexButton {
  type: 'button'
  action: {
    type: 'uri'
    label: string
    uri: string
  }
  style?: 'primary' | 'secondary' | 'link'
  color?: string
  height?: 'sm' | 'md'
  margin?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
}

export interface LineFlexSeparator {
  type: 'separator'
  margin?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  color?: string
}

export interface LineFlexBox {
  type: 'box'
  layout: 'horizontal' | 'vertical' | 'baseline'
  contents: LineFlexComponent[]
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  margin?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  paddingAll?: string
  paddingTop?: string
  paddingBottom?: string
  paddingStart?: string
  paddingEnd?: string
  backgroundColor?: string
  cornerRadius?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  flex?: number
  alignItems?: 'flex-start' | 'center' | 'flex-end'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
  borderWidth?: 'none' | 'light' | 'normal' | 'medium' | 'semi-bold' | 'bold'
  borderColor?: string
}

export type LineFlexComponent = LineFlexBox | LineFlexText | LineFlexButton | LineFlexSeparator

export interface LineFlexBubble {
  type: 'bubble'
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga'
  header?: LineFlexBox
  hero?: LineFlexComponent
  body?: LineFlexBox
  footer?: LineFlexBox
  styles?: {
    header?: { backgroundColor?: string }
    body?: { backgroundColor?: string }
    footer?: { backgroundColor?: string }
  }
}

export interface LineFlexMessage {
  type: 'flex'
  altText: string
  contents: LineFlexBubble
}

export interface FlexBubbleBaseParams {
  badgeTone: BadgeTone
  badgeLabel: string
  title: string
  rows: Array<{ label: string; value: string }>
  primaryButton: { label: string; uri: string }
  secondaryButton?: { label: string; uri: string }
  altText: string
}

/**
 * Cắt chuỗi an toàn, đảm bảo không vượt quá độ dài tối đa
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

/**
 * Format số tiền theo định dạng tiền tệ của ngôn ngữ được chỉ định
 */
export function formatAmount(amount: string | number | undefined | null, locale: LineMessageLocale): string {
  if (amount === undefined || amount === null || amount === '') {
    return locale === 'ja' ? '¥0' : '0 đ'
  }

  if (typeof amount === 'number') {
    if (!Number.isFinite(amount) || Number.isNaN(amount)) {
      return locale === 'ja' ? '¥0' : '0 đ'
    }
    if (locale === 'ja') {
      if (amount < 0) {
        return `-¥${Math.abs(amount).toLocaleString('ja-JP')}`
      }
      return `¥${amount.toLocaleString('ja-JP')}`
    }
    return `${amount.toLocaleString('vi-VN')} đ`
  }

  const numericValue = Number(amount)
  if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
    if (locale === 'ja') {
      if (numericValue < 0) {
        return `-¥${Math.abs(numericValue).toLocaleString('ja-JP')}`
      }
      return `¥${numericValue.toLocaleString('ja-JP')}`
    }
    return `${numericValue.toLocaleString('vi-VN')} đ`
  }

  return String(amount)
}

/**
 * Tạo Box Badge trạng thái bo tròn góc theo tone định sẵn
 */
export function createFlexBadge(tone: BadgeTone, label: string): LineFlexBox {
  const badgeConfig = FLEX_BADGE_TONES[tone] || FLEX_BADGE_TONES.muted

  return {
    type: 'box',
    layout: 'horizontal',
    backgroundColor: badgeConfig.backgroundColor,
    cornerRadius: 'xxl',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingStart: '8px',
    paddingEnd: '8px',
    alignItems: 'center',
    justifyContent: 'center',
    contents: [
      {
        type: 'text',
        text: truncateText(label, 40),
        color: badgeConfig.textColor,
        size: 'xxs',
        weight: 'bold',
      },
    ],
  }
}

/**
 * Tạo hàng hiển thị Key-Value 2 cột (Flex 3:7)
 */
export function createKeyValueRow(label: string, value: string): LineFlexBox {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    margin: 'sm',
    contents: [
      {
        type: 'text',
        text: label,
        color: FLEX_THEME.textMuted,
        size: 'sm',
        flex: 3,
        wrap: true,
      },
      {
        type: 'text',
        text: value || '—',
        color: FLEX_THEME.textPrimary,
        size: 'sm',
        weight: 'bold',
        flex: 7,
        wrap: true,
      },
    ],
  }
}

/**
 * Tạo nút bấm CTA Flex Message
 */
export function createFlexButton(
  label: string,
  uri: string,
  style: 'primary' | 'secondary' = 'primary'
): LineFlexButton {
  return {
    type: 'button',
    action: {
      type: 'uri',
      label: truncateText(label, 40),
      uri: uri || 'https://line.me',
    },
    style,
    color: style === 'primary' ? FLEX_THEME.brandGreen : FLEX_THEME.brandTeal,
    height: 'sm',
  }
}

/**
 * Khung nền tảng Bubble Card RoGym Dark Theme
 */
export function buildFlexBubbleBase(params: FlexBubbleBaseParams): LineFlexMessage {
  const footerContents: LineFlexComponent[] = [
    createFlexButton(params.primaryButton.label, params.primaryButton.uri, 'primary'),
  ]

  if (params.secondaryButton) {
    footerContents.push(
      createFlexButton(params.secondaryButton.label, params.secondaryButton.uri, 'secondary')
    )
  }

  const rowBoxes = params.rows.map((row) => createKeyValueRow(row.label, row.value))

  const bubble: LineFlexBubble = {
    type: 'bubble',
    styles: {
      header: { backgroundColor: FLEX_THEME.bgCard },
      body: { backgroundColor: FLEX_THEME.bgCard },
      footer: { backgroundColor: FLEX_THEME.bgCard },
    },
    header: {
      type: 'box',
      layout: 'horizontal',
      alignItems: 'center',
      justifyContent: 'space-between',
      contents: [
        {
          type: 'text',
          text: 'ROGYM',
          color: FLEX_THEME.brandGreen,
          weight: 'bold',
          size: 'sm',
          flex: 0,
        },
        createFlexBadge(params.badgeTone, params.badgeLabel),
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: params.title,
          weight: 'bold',
          size: 'xl',
          color: FLEX_THEME.textPrimary,
          wrap: true,
        },
        {
          type: 'separator',
          color: FLEX_THEME.borderSubtle,
          margin: 'md',
        },
        ...rowBoxes,
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: footerContents,
    },
  }

  return {
    type: 'flex',
    altText: truncateText(params.altText, 400),
    contents: bubble,
  }
}

// ==========================================
// 12 BUILDER FUNCTIONS CHI TIẾT (TỪ ĐIỂN LOCALES)
// ==========================================

/**
 * 1. Đặt lịch PT mới (training.created)
 */
export function buildTrainingBookingCreatedFlex(
  data: { sessionName?: string; when: string; trainerName: string; roomName: string },
  locale: LineMessageLocale,
  liffUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.trainingCreated
  const sessionName = data.sessionName || t.fallbacks.sessionName
  const trainerName = data.trainerName || t.fallbacks.trainerName
  const when = data.when || dict.common.defaultEmpty
  const roomName = data.roomName || dict.common.defaultEmpty

  return buildFlexBubbleBase({
    badgeTone: 'success',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText({ trainerName, when }),
    rows: [
      { label: t.labels.sessionName, value: sessionName },
      { label: t.labels.when, value: when },
      { label: t.labels.trainer, value: trainerName },
      { label: t.labels.room, value: roomName },
    ],
    primaryButton: {
      label: dict.common.detailButton,
      uri: liffUrl,
    },
  })
}

/**
 * 2. Đổi lịch PT (training.updated)
 */
export function buildTrainingBookingUpdatedFlex(
  data: { sessionName?: string; when: string; trainerName: string; roomName: string },
  locale: LineMessageLocale,
  liffUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.trainingUpdated
  const sessionName = data.sessionName || t.fallbacks.sessionName
  const trainerName = data.trainerName || t.fallbacks.trainerName
  const when = data.when || dict.common.defaultEmpty
  const roomName = data.roomName || dict.common.defaultEmpty

  return buildFlexBubbleBase({
    badgeTone: 'info',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText({ trainerName, when }),
    rows: [
      { label: t.labels.sessionName, value: sessionName },
      { label: t.labels.when, value: when },
      { label: t.labels.trainer, value: trainerName },
      { label: t.labels.room, value: roomName },
    ],
    primaryButton: {
      label: dict.common.detailButton,
      uri: liffUrl,
    },
  })
}

/**
 * 3. Hủy lịch PT (training.cancelled)
 */
export function buildTrainingBookingCancelledFlex(
  data: { sessionName?: string; when: string; trainerName: string },
  locale: LineMessageLocale,
  liffUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.trainingCancelled
  const sessionName = data.sessionName || t.fallbacks.sessionName
  const trainerName = data.trainerName || t.fallbacks.trainerName
  const when = data.when || dict.common.defaultEmpty

  return buildFlexBubbleBase({
    badgeTone: 'danger',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText({ trainerName, when }),
    rows: [
      { label: t.labels.sessionName, value: sessionName },
      { label: t.labels.when, value: when },
      { label: t.labels.trainer, value: trainerName },
    ],
    primaryButton: {
      label: dict.common.detailButton,
      uri: liffUrl,
    },
  })
}

/**
 * 4. Nhắc trước buổi tập (training.reminder)
 */
export function buildTrainingReminderFlex(
  data: { sessionName?: string; when: string; trainerName: string; roomName: string; reminderMinutes?: number },
  locale: LineMessageLocale,
  liffUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.trainingReminder
  const reminderMinutes = data.reminderMinutes ?? 30
  const sessionName = data.sessionName || t.fallbacks.sessionName
  const trainerName = data.trainerName || t.fallbacks.trainerName
  const when = data.when || dict.common.defaultEmpty
  const roomName = data.roomName || dict.common.defaultEmpty

  return buildFlexBubbleBase({
    badgeTone: 'warning',
    badgeLabel: t.badge(reminderMinutes),
    title: t.title,
    altText: t.altText({ trainerName, minutes: reminderMinutes }),
    rows: [
      { label: t.labels.sessionName, value: sessionName },
      { label: t.labels.when, value: when },
      { label: t.labels.trainer, value: trainerName },
      { label: t.labels.room, value: roomName },
    ],
    primaryButton: {
      label: dict.common.detailButton,
      uri: liffUrl,
    },
  })
}

/**
 * 5. Đến giờ tập (training.starting)
 */
export function buildTrainingStartingFlex(
  data: { sessionName?: string; when: string; trainerName: string; roomName: string },
  locale: LineMessageLocale,
  liffUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.trainingStarting
  const sessionName = data.sessionName || t.fallbacks.sessionName
  const trainerName = data.trainerName || t.fallbacks.trainerName
  const when = data.when || dict.common.defaultEmpty
  const roomName = data.roomName || dict.common.defaultEmpty

  return buildFlexBubbleBase({
    badgeTone: 'success',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText({ trainerName }),
    rows: [
      { label: t.labels.sessionName, value: sessionName },
      { label: t.labels.when, value: when },
      { label: t.labels.trainer, value: trainerName },
      { label: t.labels.room, value: roomName },
    ],
    primaryButton: {
      label: dict.common.detailButton,
      uri: liffUrl,
    },
  })
}

/**
 * 6. Hoàn thành buổi tập (training.completed)
 */
export function buildTrainingCompletedFlex(
  data: { sessionName?: string; when: string; trainerName: string; roomName?: string },
  locale: LineMessageLocale,
  reviewUrl: string,
  historyUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.trainingCompleted
  const sessionName = data.sessionName || t.fallbacks.sessionName
  const trainerName = data.trainerName || t.fallbacks.trainerName
  const when = data.when || dict.common.defaultEmpty

  const rows = [
    { label: t.labels.sessionName, value: sessionName },
    { label: t.labels.when, value: when },
    { label: t.labels.trainer, value: trainerName },
  ]

  if (data.roomName) {
    rows.push({ label: t.labels.room, value: data.roomName })
  }

  return buildFlexBubbleBase({
    badgeTone: 'success',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText({ trainerName }),
    rows,
    primaryButton: {
      label: t.buttons.review,
      uri: reviewUrl,
    },
    secondaryButton: {
      label: t.buttons.history,
      uri: historyUrl,
    },
  })
}

/**
 * 7. Điểm danh (attendance.checkin)
 */
export function buildAttendanceCheckinFlex(
  data: { checkinTime: string; branchName?: string },
  locale: LineMessageLocale,
  liffUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.attendanceCheckin
  const checkinTime = data.checkinTime || dict.common.defaultEmpty
  const branchName = data.branchName || t.fallbacks.branchName

  return buildFlexBubbleBase({
    badgeTone: 'success',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText(),
    rows: [
      { label: t.labels.checkinTime, value: checkinTime },
      { label: t.labels.branch, value: branchName },
    ],
    primaryButton: {
      label: t.buttons.viewCardAndHistory,
      uri: liffUrl,
    },
  })
}

/**
 * 8. Nhắc hết hạn gói (subscription.expiring_soon)
 */
export function buildSubscriptionExpiringFlex(
  data: { packageName: string; endDate: string },
  locale: LineMessageLocale,
  renewUrl: string,
  detailUrl?: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.subscriptionExpiring
  const packageName = data.packageName || t.fallbacks.packageName
  const endDate = data.endDate || dict.common.defaultEmpty

  return buildFlexBubbleBase({
    badgeTone: 'warning',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText({ packageName, endDate }),
    rows: [
      { label: t.labels.packageName, value: packageName },
      { label: t.labels.endDate, value: endDate },
    ],
    primaryButton: {
      label: t.buttons.renew,
      uri: renewUrl,
    },
    secondaryButton: detailUrl
      ? {
          label: t.buttons.detail,
          uri: detailUrl,
        }
      : undefined,
  })
}

/**
 * 9. Thanh toán thành công (payment.success)
 */
export function buildPaymentSuccessFlex(
  data: {
    packageName: string
    amount: string | number
    paymentMethod?: string
    paymentCode?: string
    paidAt?: string
  },
  locale: LineMessageLocale,
  liffUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.paymentSuccess
  const packageName = data.packageName || t.fallbacks.packageName
  const formattedAmount = formatAmount(data.amount, locale)
  const paymentMethod = data.paymentMethod || t.fallbacks.paymentMethod
  const paymentCode = data.paymentCode || t.fallbacks.paymentCode

  const rows = [
    { label: t.labels.packageName, value: packageName },
    { label: t.labels.amount, value: formattedAmount },
    { label: t.labels.paymentMethod, value: paymentMethod },
    { label: t.labels.paymentCode, value: paymentCode },
  ]

  if (data.paidAt) {
    rows.push({ label: t.labels.paidAt, value: data.paidAt })
  }

  return buildFlexBubbleBase({
    badgeTone: 'success',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText({ packageName }),
    rows,
    primaryButton: {
      label: t.buttons.detail,
      uri: liffUrl,
    },
  })
}

/**
 * 10. Phản hồi góp ý (feedback.responded)
 */
export function buildFeedbackRespondedFlex(
  data: {
    feedbackTitle?: string
    feedbackContent?: string
    responseContent?: string
    respondedAt: string
    responderName?: string
  },
  locale: LineMessageLocale,
  liffUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.feedbackResponded
  const feedbackTitle = data.feedbackTitle || t.fallbacks.feedbackTitle
  const respondedAt = data.respondedAt || dict.common.defaultEmpty

  const rows = [
    { label: t.labels.feedbackTitle, value: feedbackTitle },
    { label: t.labels.respondedAt, value: respondedAt },
  ]

  if (data.responderName) {
    rows.push({ label: t.labels.responderName, value: data.responderName })
  }

  return buildFlexBubbleBase({
    badgeTone: 'info',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText(),
    rows,
    primaryButton: {
      label: t.buttons.view,
      uri: liffUrl,
    },
  })
}

/**
 * 11. Webhook Welcome (follow)
 */
export function buildWelcomeFlex(
  locale: LineMessageLocale,
  liffUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.welcome

  return buildFlexBubbleBase({
    badgeTone: 'success',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText(),
    rows: [
      {
        label: t.labels.guide,
        value: t.guideText,
      },
    ],
    primaryButton: {
      label: t.buttons.openApp,
      uri: liffUrl,
    },
  })
}

/**
 * 12. Webhook Auto-help (message)
 */
export function buildHelpAutoReplyFlex(
  locale: LineMessageLocale,
  liffUrl: string
): LineFlexMessage {
  const dict = getFlexLocales(locale)
  const t = dict.helpAutoReply

  return buildFlexBubbleBase({
    badgeTone: 'muted',
    badgeLabel: t.badge,
    title: t.title,
    altText: t.altText(),
    rows: [
      {
        label: t.labels.notice,
        value: t.noticeText,
      },
    ],
    primaryButton: {
      label: t.buttons.openApp,
      uri: liffUrl,
    },
  })
}
