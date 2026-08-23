import {
  FLEX_BADGE_TONES,
  FLEX_THEME,
  BadgeTone,
} from './line-flex-tokens'
import {
  getFlexLocales,
  LINE_FLEX_LOCALES,
} from './line-flex-locales'
import {
  buildAttendanceCheckinFlex,
  buildFeedbackRespondedFlex,
  buildFlexBubbleBase,
  buildHelpAutoReplyFlex,
  buildPaymentSuccessFlex,
  buildSubscriptionExpiringFlex,
  buildTrainingBookingCancelledFlex,
  buildTrainingBookingCreatedFlex,
  buildTrainingBookingUpdatedFlex,
  buildTrainingCompletedFlex,
  buildTrainingReminderFlex,
  buildTrainingStartingFlex,
  buildWelcomeFlex,
  createFlexBadge,
  createFlexButton,
  createKeyValueRow,
  formatAmount,
  LineFlexBox,
  LineFlexComponent,
  LineFlexMessage,
  LineMessageLocale,
} from './line-flex-builder'

describe('LineFlexBuilder, LineFlexTokens & LineFlexLocales (Phase 1)', () => {
  // Kiểm thử tính toàn vẹn và song song 100% của bộ từ điển locales
  describe('Tầng 0: Tính Toàn Vẹn Từ Điển Song Ngữ (line-flex-locales)', () => {
    it('0.1 getFlexLocales trả về đúng từ điển vi, ja và fallback về vi khi locale lạ', () => {
      expect(getFlexLocales('vi')).toBe(LINE_FLEX_LOCALES.vi)
      expect(getFlexLocales('ja')).toBe(LINE_FLEX_LOCALES.ja)
      expect(getFlexLocales('fr' as unknown as LineMessageLocale)).toBe(LINE_FLEX_LOCALES.vi)
    })

    it('0.2 Đối sánh 100% các keys giữa từ điển Tiếng Việt và Tiếng Nhật', () => {
      const viKeys = Object.keys(LINE_FLEX_LOCALES.vi).sort()
      const jaKeys = Object.keys(LINE_FLEX_LOCALES.ja).sort()
      expect(viKeys).toEqual(jaKeys)

      for (const key of viKeys) {
        const viSection = (LINE_FLEX_LOCALES.vi as unknown as Record<string, unknown>)[key]
        const jaSection = (LINE_FLEX_LOCALES.ja as unknown as Record<string, unknown>)[key]
        expect(typeof viSection).toBe('object')
        expect(typeof jaSection).toBe('object')
        expect(Object.keys(viSection as object).sort()).toEqual(Object.keys(jaSection as object).sort())
      }
    })
  })
  // Helper: Trích xuất đệ quy tất cả mã màu HEX trong cây Flex Bubble
  function extractAllHexColors(node: unknown, colors: string[] = []): string[] {
    if (!node || typeof node !== 'object') return colors

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === 'string' && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
        colors.push(value.toLowerCase())
      } else if (typeof value === 'object' && value !== null) {
        extractAllHexColors(value, colors)
      }
    }
    return colors
  }

  // Helper: Tính độ sâu lồng ghép Box tối đa trong cây Flex Bubble
  function getMaxBoxDepth(component: LineFlexComponent | LineFlexBox, currentDepth = 1): number {
    if (component.type !== 'box') return currentDepth
    const box = component as LineFlexBox
    if (!box.contents || box.contents.length === 0) return currentDepth

    let maxChildDepth = currentDepth
    for (const child of box.contents) {
      const childDepth = getMaxBoxDepth(child, currentDepth + 1)
      if (childDepth > maxChildDepth) {
        maxChildDepth = childDepth
      }
    }
    return maxChildDepth
  }

  // Danh sách các mã màu hợp lệ từ Token System
  const validTokenColors = new Set(
    [
      ...Object.values(FLEX_THEME),
      ...Object.values(FLEX_BADGE_TONES).flatMap((b) => [
        b.textColor,
        b.backgroundColor,
        b.accentColor,
      ]),
    ].map((c) => c.toLowerCase())
  )

  // =========================================================================
  // TẦNG 1: KIỂM THỬ CẤU TRÚC & GIỚI HẠN LINE FLEX SCHEMA (SCHEMA & BOUNDS)
  // =========================================================================
  describe('Tầng 1: LINE Flex Schema & Bounds', () => {
    it('1.1 formatAmount format chính xác số tiền hoặc trả về chuỗi fallback an toàn', () => {
      expect(formatAmount(500000, 'vi')).toBe('500.000 đ')
      expect(formatAmount(5000, 'ja')).toBe('¥5,000')
      expect(formatAmount('1000000', 'vi')).toBe('1.000.000 đ')
      expect(formatAmount('5000', 'ja')).toBe('¥5,000')
      expect(formatAmount(undefined, 'vi')).toBe('0 đ')
      expect(formatAmount(null, 'ja')).toBe('¥0')
      expect(formatAmount('', 'vi')).toBe('0 đ')
      expect(formatAmount('Đã thanh toán', 'vi')).toBe('Đã thanh toán')
    })

    it('1.2 createFlexBadge tạo Box bo góc đúng chuẩn, flex: 0 và nhãn text không vượt 40 ký tự', () => {
      const badge = createFlexBadge('success', 'A'.repeat(50))
      expect(badge.type).toBe('box')
      expect(badge.layout).toBe('horizontal')
      expect(badge.flex).toBe(0)
      expect(badge.cornerRadius).toBe('xxl')
      expect(badge.backgroundColor).toBe(FLEX_BADGE_TONES.success.backgroundColor)
      expect(badge.contents[0].type).toBe('text')
      expect((badge.contents[0] as { flex?: number }).flex).toBe(0)
      expect((badge.contents[0] as { text: string }).text).toHaveLength(40)
      expect((badge.contents[0] as { color: string }).color).toBe(FLEX_BADGE_TONES.success.textColor)

      // Fallback khi tone không hợp lệ và nhãn rỗng
      const fallbackBadge = createFlexBadge('unknown' as unknown as BadgeTone, '')
      expect(fallbackBadge.backgroundColor).toBe(FLEX_BADGE_TONES.muted.backgroundColor)
      expect((fallbackBadge.contents[0] as { text: string }).text).toBe('')
    })

    it('1.3 createKeyValueRow tạo hàng 2 cột với tỷ lệ Flex 3:7 và wrap text', () => {
      const row = createKeyValueRow('Bài tập', 'Cardio')
      expect(row.type).toBe('box')
      expect(row.layout).toBe('horizontal')
      expect(row.contents).toHaveLength(2)

      const [labelComp, valueComp] = row.contents as Array<{
        type: string
        text: string
        flex: number
        wrap: boolean
        color: string
      }>
      expect(labelComp.text).toBe('Bài tập')
      expect(labelComp.flex).toBe(3)
      expect(labelComp.color).toBe(FLEX_THEME.textMuted)

      expect(valueComp.text).toBe('Cardio')
      expect(valueComp.flex).toBe(7)
      expect(valueComp.color).toBe(FLEX_THEME.textPrimary)
      expect(valueComp.wrap).toBe(true)

      // Fallback khi value rỗng
      const emptyRow = createKeyValueRow('Ghi chú', '')
      expect((emptyRow.contents[1] as { text: string }).text).toBe('—')
    })

    it('1.4 createFlexButton tạo action URI hợp lệ và cắt nhãn quá 40 ký tự', () => {
      const longLabel = 'B'.repeat(50)
      const primaryBtn = createFlexButton(longLabel, 'https://rogym.vn/liff/test', 'primary')
      expect(primaryBtn.type).toBe('button')
      expect(primaryBtn.action.label).toHaveLength(40)
      expect(primaryBtn.action.uri).toBe('https://rogym.vn/liff/test')
      expect(primaryBtn.style).toBe('primary')
      expect(primaryBtn.color).toBe(FLEX_THEME.brandGreen)

      // Nút với style mặc định (không truyền tham số thứ 3)
      const defaultStyleBtn = createFlexButton('Mặc định', 'https://rogym.vn')
      expect(defaultStyleBtn.style).toBe('primary')
      expect(defaultStyleBtn.color).toBe(FLEX_THEME.brandGreen)

      const secondaryBtn = createFlexButton('Xem thêm', '', 'secondary')
      expect(secondaryBtn.action.uri).toBe('https://line.me')
      expect(secondaryBtn.style).toBe('secondary')
      expect(secondaryBtn.color).toBe(FLEX_THEME.brandTeal)

      const emptyBtn = createFlexButton('', '')
      expect(emptyBtn.action.label).toBe('')
    })

    it('1.5 buildFlexBubbleBase trả về đúng schema LINE Flex Message (compact size kilo) và giới hạn altText 400 ký tự', () => {
      const longAltText = 'C'.repeat(500)
      const message = buildFlexBubbleBase({
        badgeTone: 'info',
        badgeLabel: 'THÔNG BÁO',
        title: 'Tiêu đề kiểm thử',
        rows: [{ label: 'Khóa', value: 'Giá trị' }],
        primaryButton: { label: 'Nút 1', uri: 'https://rogym.vn/p' },
        secondaryButton: { label: 'Nút 2', uri: 'https://rogym.vn/s' },
        altText: longAltText,
      })

      expect(message.type).toBe('flex')
      expect(message.altText).toHaveLength(400)
      expect(message.contents.type).toBe('bubble')
      expect(message.contents.size).toBe('kilo')
      expect(message.contents.styles?.header?.backgroundColor).toBe(FLEX_THEME.bgCard)
      expect(message.contents.styles?.body?.backgroundColor).toBe(FLEX_THEME.bgCard)
      expect(message.contents.styles?.footer?.backgroundColor).toBe(FLEX_THEME.bgCard)

      // Test altText rỗng
      const emptyAltMsg = buildFlexBubbleBase({
        badgeTone: 'muted',
        badgeLabel: 'TEST',
        title: 'Title',
        rows: [],
        primaryButton: { label: 'Btn', uri: '' },
        altText: '',
      })
      expect(emptyAltMsg.altText).toBe('')

      // Kiểm tra Header có Brand Name ROGYM và Badge
      const headerContents = message.contents.header?.contents || []
      expect(headerContents).toHaveLength(2)
      expect((headerContents[0] as { text: string }).text).toBe('ROGYM')

      // Kiểm tra Body có title (size lg), separator và row
      const bodyContents = message.contents.body?.contents || []
      expect(bodyContents.length).toBeGreaterThanOrEqual(3)
      expect((bodyContents[0] as { text: string; size?: string }).text).toBe('Tiêu đề kiểm thử')
      expect((bodyContents[0] as { size?: string }).size).toBe('lg')
      expect(bodyContents[1].type).toBe('separator')

      // Kiểm tra Footer có 2 nút
      const footerContents = message.contents.footer?.contents || []
      expect(footerContents).toHaveLength(2)

      // Đảm bảo độ sâu cây Box không vượt quá 10
      const headerDepth = getMaxBoxDepth(message.contents.header!)
      const bodyDepth = getMaxBoxDepth(message.contents.body!)
      const footerDepth = getMaxBoxDepth(message.contents.footer!)
      expect(Math.max(headerDepth, bodyDepth, footerDepth)).toBeLessThanOrEqual(10)
    })

    it('1.6 buildFlexBubbleBase với heroImageUrl tạo thẻ kilo (nằm ngang hàng avatar), hero image cover và giữ full header (ROGYM + Badge)', () => {
      const message = buildFlexBubbleBase({
        badgeTone: 'success',
        badgeLabel: 'XÁC NHẬN',
        title: 'Đặt lịch thành công',
        heroImageUrl: 'https://rogym.vn/assets/cover_photo.jpg',
        rows: [{ label: 'Khóa', value: 'Giá trị' }],
        primaryButton: { label: 'Xem chi tiết', uri: 'https://rogym.vn/p' },
        altText: 'Thông báo đặt lịch',
      })

      expect(message.contents.size).toBe('kilo')
      expect(message.contents.hero).toEqual({
        type: 'image',
        url: 'https://rogym.vn/assets/cover_photo.jpg',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      })
      // Header có cả ROGYM và Badge
      const headerContents = message.contents.header?.contents || []
      expect(headerContents).toHaveLength(2)
      expect((headerContents[0] as { text: string }).text).toBe('ROGYM')
      expect(headerContents[1].type).toBe('box')
      expect(message.contents.header?.justifyContent).toBe('space-between')
    })
  })

  // =========================================================================
  // TẦNG 2: KIỂM THỬ DESIGN TOKEN & BADGE CONFORMANCE
  // =========================================================================
  describe('Tầng 2: Design Token & Badge Conformance', () => {
    it('2.1 FLEX_THEME và FLEX_BADGE_TONES khớp 100% mã màu quy chuẩn RoGym Dark Theme', () => {
      expect(FLEX_THEME.bgCard).toBe('#0f1c16')
      expect(FLEX_THEME.bgElevated).toBe('#1a2520')
      expect(FLEX_THEME.brandGreen).toBe('#06c384')
      expect(FLEX_THEME.brandTeal).toBe('#42e09e')
      expect(FLEX_THEME.brandDark).toBe('#00492f')
      expect(FLEX_THEME.textPrimary).toBe('#ffffff')
      expect(FLEX_THEME.textSecondary).toBe('#bbcabf')
      expect(FLEX_THEME.textMuted).toBe('#8ab89c')
      expect(FLEX_THEME.borderSubtle).toBe('#26382e')

      expect(FLEX_BADGE_TONES.success).toEqual({
        textColor: '#42e09e',
        backgroundColor: '#1a3326',
        accentColor: '#06c384',
      })
      expect(FLEX_BADGE_TONES.info).toEqual({
        textColor: '#7dd3fc',
        backgroundColor: '#0c2838',
        accentColor: '#38bdf8',
      })
      expect(FLEX_BADGE_TONES.warning).toEqual({
        textColor: '#fcd34d',
        backgroundColor: '#2e2107',
        accentColor: '#fbbf24',
      })
      expect(FLEX_BADGE_TONES.danger).toEqual({
        textColor: '#ff6b6b',
        backgroundColor: '#2d1212',
        accentColor: '#f87171',
      })
      expect(FLEX_BADGE_TONES.muted).toEqual({
        textColor: '#bbcabf',
        backgroundColor: '#1a2520',
        accentColor: '#8ab89c',
      })
    })

    it('2.2 Tất cả 12 hàm Builder chỉ sử dụng các mã màu HEX hợp lệ từ Token System (Không có màu lạ)', () => {
      const sampleMessages: LineFlexMessage[] = [
        buildTrainingBookingCreatedFlex(
          { when: '14:00', trainerName: 'Alex', roomName: 'Studio 1' },
          'vi',
          'https://rogym.vn'
        ),
        buildTrainingBookingUpdatedFlex(
          { when: '15:00', trainerName: 'Alex', roomName: 'Studio 2' },
          'vi',
          'https://rogym.vn'
        ),
        buildTrainingBookingCancelledFlex(
          { when: '14:00', trainerName: 'Alex' },
          'vi',
          'https://rogym.vn'
        ),
        buildTrainingReminderFlex(
          { when: '14:00', trainerName: 'Alex', roomName: 'Studio 1' },
          'vi',
          'https://rogym.vn'
        ),
        buildTrainingStartingFlex(
          { when: '14:00', trainerName: 'Alex', roomName: 'Studio 1' },
          'vi',
          'https://rogym.vn'
        ),
        buildTrainingCompletedFlex(
          { when: '14:00 - 15:00', trainerName: 'Alex', roomName: 'Studio 1' },
          'vi',
          'https://rogym.vn/rev',
          'https://rogym.vn/his'
        ),
        buildAttendanceCheckinFlex(
          { checkinTime: '10:00', branchName: 'Quận 1' },
          'vi',
          'https://rogym.vn'
        ),
        buildSubscriptionExpiringFlex(
          { packageName: 'VIP 1 Tháng', endDate: '2026-09-01' },
          'vi',
          'https://rogym.vn/renew',
          'https://rogym.vn/detail'
        ),
        buildPaymentSuccessFlex(
          { packageName: 'VIP', amount: 1500000, paidAt: '2026-08-23' },
          'vi',
          'https://rogym.vn'
        ),
        buildFeedbackRespondedFlex(
          { feedbackTitle: 'Máy tập', respondedAt: '2026-08-23', responderName: 'Admin' },
          'vi',
          'https://rogym.vn'
        ),
        buildWelcomeFlex('vi', 'https://rogym.vn'),
        buildHelpAutoReplyFlex('vi', 'https://rogym.vn'),
      ]

      for (const msg of sampleMessages) {
        const colors = extractAllHexColors(msg)
        expect(colors.length).toBeGreaterThan(0)
        for (const color of colors) {
          expect(validTokenColors.has(color)).toBe(true)
        }
      }
    })

    it('2.3 Xác nhận đúng Tone của từng Builder theo bảng đặc tả', () => {
      // 1. created -> success
      const created = buildTrainingBookingCreatedFlex(
        { when: '10:00', trainerName: 'T', roomName: 'R' },
        'vi',
        'uri'
      )
      const badgeCreated = (created.contents.header?.contents[1] as LineFlexBox)
      expect(badgeCreated.backgroundColor).toBe(FLEX_BADGE_TONES.success.backgroundColor)

      // 2. updated -> info
      const updated = buildTrainingBookingUpdatedFlex(
        { when: '10:00', trainerName: 'T', roomName: 'R' },
        'vi',
        'uri'
      )
      const badgeUpdated = (updated.contents.header?.contents[1] as LineFlexBox)
      expect(badgeUpdated.backgroundColor).toBe(FLEX_BADGE_TONES.info.backgroundColor)

      // 3. cancelled -> danger
      const cancelled = buildTrainingBookingCancelledFlex(
        { when: '10:00', trainerName: 'T' },
        'vi',
        'uri'
      )
      const badgeCancelled = (cancelled.contents.header?.contents[1] as LineFlexBox)
      expect(badgeCancelled.backgroundColor).toBe(FLEX_BADGE_TONES.danger.backgroundColor)

      // 4. reminder -> warning
      const reminder = buildTrainingReminderFlex(
        { when: '10:00', trainerName: 'T', roomName: 'R' },
        'vi',
        'uri'
      )
      const badgeReminder = (reminder.contents.header?.contents[1] as LineFlexBox)
      expect(badgeReminder.backgroundColor).toBe(FLEX_BADGE_TONES.warning.backgroundColor)

      // 5. starting -> success
      const starting = buildTrainingStartingFlex(
        { when: '10:00', trainerName: 'T', roomName: 'R' },
        'vi',
        'uri'
      )
      const badgeStarting = (starting.contents.header?.contents[1] as LineFlexBox)
      expect(badgeStarting.backgroundColor).toBe(FLEX_BADGE_TONES.success.backgroundColor)

      // 6. completed -> success
      const completed = buildTrainingCompletedFlex(
        { when: '10:00', trainerName: 'T' },
        'vi',
        'uri1',
        'uri2'
      )
      const badgeCompleted = (completed.contents.header?.contents[1] as LineFlexBox)
      expect(badgeCompleted.backgroundColor).toBe(FLEX_BADGE_TONES.success.backgroundColor)

      // 7. checkin -> success
      const checkin = buildAttendanceCheckinFlex({ checkinTime: '10:00' }, 'vi', 'uri')
      const badgeCheckin = (checkin.contents.header?.contents[1] as LineFlexBox)
      expect(badgeCheckin.backgroundColor).toBe(FLEX_BADGE_TONES.success.backgroundColor)

      // 8. subscription expiring -> warning
      const sub = buildSubscriptionExpiringFlex(
        { packageName: 'P', endDate: 'E' },
        'vi',
        'uri'
      )
      const badgeSub = (sub.contents.header?.contents[1] as LineFlexBox)
      expect(badgeSub.backgroundColor).toBe(FLEX_BADGE_TONES.warning.backgroundColor)

      // 9. payment -> success
      const pay = buildPaymentSuccessFlex({ packageName: 'P', amount: 1000 }, 'vi', 'uri')
      const badgePay = (pay.contents.header?.contents[1] as LineFlexBox)
      expect(badgePay.backgroundColor).toBe(FLEX_BADGE_TONES.success.backgroundColor)

      // 10. feedback -> info
      const fb = buildFeedbackRespondedFlex({ respondedAt: 'T' }, 'vi', 'uri')
      const badgeFb = (fb.contents.header?.contents[1] as LineFlexBox)
      expect(badgeFb.backgroundColor).toBe(FLEX_BADGE_TONES.info.backgroundColor)

      // 11. welcome -> success
      const welcome = buildWelcomeFlex('vi', 'uri')
      const badgeWelcome = (welcome.contents.header?.contents[1] as LineFlexBox)
      expect(badgeWelcome.backgroundColor).toBe(FLEX_BADGE_TONES.success.backgroundColor)

      // 12. help -> muted
      const help = buildHelpAutoReplyFlex('vi', 'uri')
      const badgeHelp = (help.contents.header?.contents[1] as LineFlexBox)
      expect(badgeHelp.backgroundColor).toBe(FLEX_BADGE_TONES.muted.backgroundColor)
    })
  })

  // =========================================================================
  // TẦNG 3: KIỂM THỬ SONG NGỮ VI/JA & DICTIONARY (24 TEST CASES)
  // =========================================================================
  describe('Tầng 3: Song Ngữ VI/JA & Dictionary (12 Builders × 2 Locales)', () => {
    const liffUrl = 'https://rogym.vn/member'

    describe('1. buildTrainingBookingCreatedFlex', () => {
      it('VI locale', () => {
        const res = buildTrainingBookingCreatedFlex(
          { sessionName: 'Ngực & Tay', when: '14:00 24/08', trainerName: 'Nam', roomName: 'P.101' },
          'vi',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('ĐẶT LỊCH THÀNH CÔNG')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Xác nhận đặt lịch tập PT')
        expect(res.altText).toContain('Đặt lịch tập thành công với PT Nam vào 14:00 24/08')
      })

      it('JA locale', () => {
        const res = buildTrainingBookingCreatedFlex(
          { sessionName: '胸＆腕', when: '8月24日 14:00', trainerName: 'ナム', roomName: '101号室' },
          'ja',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('予約完了')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('トレーニング予約が完了しました')
        expect(res.altText).toContain('予約が完了しました')
      })
    })

    describe('2. buildTrainingBookingUpdatedFlex', () => {
      it('VI locale', () => {
        const res = buildTrainingBookingUpdatedFlex(
          { sessionName: 'Chân', when: '16:00 25/08', trainerName: 'Nam', roomName: 'P.102' },
          'vi',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('ĐÃ ĐIỀU CHỈNH LỊCH')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Lịch tập đã được thay đổi')
        expect(res.altText).toContain('đã đổi sang 16:00 25/08')
      })

      it('JA locale', () => {
        const res = buildTrainingBookingUpdatedFlex(
          { sessionName: '脚', when: '8月25日 16:00', trainerName: 'ナム', roomName: '102号室' },
          'ja',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('予約変更')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('トレーニング予約が更新されました')
        expect(res.altText).toContain('変更されました')
      })
    })

    describe('3. buildTrainingBookingCancelledFlex', () => {
      it('VI locale', () => {
        const res = buildTrainingBookingCancelledFlex(
          { sessionName: 'Lưng', when: '10:00 26/08', trainerName: 'Alex' },
          'vi',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('LỊCH TẬP ĐÃ HỦY')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Lịch tập đã bị hủy')
        expect(res.altText).toContain('đã bị hủy')
      })

      it('JA locale', () => {
        const res = buildTrainingBookingCancelledFlex(
          { sessionName: '背中', when: '8月26日 10:00', trainerName: 'アレックス' },
          'ja',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('予約キャンセル')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('トレーニング予約がキャンセルされました')
        expect(res.altText).toContain('キャンセルされました')
      })
    })

    describe('4. buildTrainingReminderFlex', () => {
      it('VI locale', () => {
        const res = buildTrainingReminderFlex(
          { when: '18:00', trainerName: 'David', roomName: 'Room A', reminderMinutes: 30 },
          'vi',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('SẮP ĐẾN GIỜ TẬP (30P)')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Nhắc nhở buổi tập sắp diễn ra')
        expect(res.altText).toContain('bắt đầu sau 30 phút')
      })

      it('JA locale', () => {
        const res = buildTrainingReminderFlex(
          { when: '18:00', trainerName: 'デイビッド', roomName: 'Room A', reminderMinutes: 15 },
          'ja',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('まもなく開始 (15分前)')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('まもなくトレーニング開始です')
        expect(res.altText).toContain('あと15分です')
      })
    })

    describe('5. buildTrainingStartingFlex', () => {
      it('VI locale', () => {
        const res = buildTrainingStartingFlex(
          { when: '18:00', trainerName: 'David', roomName: 'Room A' },
          'vi',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('ĐẾN GIỜ TẬP')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Đã đến giờ tập luyện')
        expect(res.altText).toContain('Đến giờ tập luyện với PT David')
      })

      it('JA locale', () => {
        const res = buildTrainingStartingFlex(
          { when: '18:00', trainerName: 'デイビッド', roomName: 'Room A' },
          'ja',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('セッション開始')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('トレーニングの時間です')
        expect(res.altText).toContain('時間になりました')
      })
    })

    describe('6. buildTrainingCompletedFlex', () => {
      it('VI locale với 2 nút CTA', () => {
        const res = buildTrainingCompletedFlex(
          { when: '14:00 - 15:00', trainerName: 'David', roomName: 'Room B' },
          'vi',
          'https://rogym.vn/review',
          'https://rogym.vn/history'
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('BUỔI TẬP HOÀN THÀNH')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Buổi tập đã hoàn thành')

        const footer = res.contents.footer?.contents as Array<{ action: { label: string; uri: string } }>
        expect(footer).toHaveLength(2)
        expect(footer[0].action.label).toBe('Đánh giá PT')
        expect(footer[0].action.uri).toBe('https://rogym.vn/review')
        expect(footer[1].action.label).toBe('Xem lịch sử')
        expect(footer[1].action.uri).toBe('https://rogym.vn/history')
      })

      it('JA locale với 2 nút CTA', () => {
        const res = buildTrainingCompletedFlex(
          { when: '14:00 - 15:00', trainerName: 'デイビッド' },
          'ja',
          'https://rogym.vn/review',
          'https://rogym.vn/history'
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('セッション完了')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('セッション完了')

        const footer = res.contents.footer?.contents as Array<{ action: { label: string; uri: string } }>
        expect(footer[0].action.label).toBe('PTを評価')
        expect(footer[1].action.label).toBe('履歴を見る')
      })
    })

    describe('7. buildAttendanceCheckinFlex', () => {
      it('VI locale', () => {
        const res = buildAttendanceCheckinFlex(
          { checkinTime: '08:30 23/08/2026', branchName: 'RoGym Premium Landmark' },
          'vi',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('CHECK-IN THÀNH CÔNG')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Check-in thành công')
        expect(res.altText).toBe('[RoGym] Bạn đã check-in thành công tại RoGym')
      })

      it('JA locale', () => {
        const res = buildAttendanceCheckinFlex(
          { checkinTime: '2026年8月23日 08:30' },
          'ja',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('チェックイン完了')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('チェックイン完了')
        expect(res.altText).toBe('[RoGym] RoGymでのチェックインが完了しました')
      })
    })

    describe('8. buildSubscriptionExpiringFlex', () => {
      it('VI locale có nút chi tiết thứ 2', () => {
        const res = buildSubscriptionExpiringFlex(
          { packageName: 'Gói 6 Tháng VIP', endDate: '30/08/2026' },
          'vi',
          'https://rogym.vn/renew',
          'https://rogym.vn/sub/123'
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('GÓI TẬP SẮP HẾT HẠN')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Gói tập sắp hết hạn')

        const footer = res.contents.footer?.contents as Array<{ action: { label: string; uri: string } }>
        expect(footer).toHaveLength(2)
        expect(footer[0].action.label).toBe('Gia hạn ngay')
        expect(footer[1].action.label).toBe('Xem chi tiết gói')
      })

      it('JA locale không có nút chi tiết (1 nút)', () => {
        const res = buildSubscriptionExpiringFlex(
          { packageName: '6ヶ月VIPプラン', endDate: '2026-08-30' },
          'ja',
          'https://rogym.vn/renew'
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('有効期限間近')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('プランの有効期限間近')

        const footer = res.contents.footer?.contents as Array<{ action: { label: string; uri: string } }>
        expect(footer).toHaveLength(1)
        expect(footer[0].action.label).toBe('今すぐ更新')
      })
    })

    describe('9. buildPaymentSuccessFlex', () => {
      it('VI locale với định dạng tiền VND', () => {
        const res = buildPaymentSuccessFlex(
          {
            packageName: 'Gói Platinum 12 Tháng',
            amount: 12500000,
            paymentMethod: 'VNPAY QR',
            paymentCode: 'TXN-998877',
            paidAt: '23/08/2026 10:15',
          },
          'vi',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('THANH TOÁN THÀNH CÔNG')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Biên lai thanh toán thành công')
        expect(res.altText).toContain('Thanh toán thành công gói Gói Platinum 12 Tháng')

        const bodyRows = (res.contents.body?.contents || []).slice(2) as LineFlexBox[]
        const amountRow = bodyRows.find((r) => (r.contents[0] as { text: string }).text === 'Số tiền thanh toán')
        expect((amountRow?.contents[1] as { text: string }).text).toBe('12.500.000 đ')
      })

      it('JA locale với định dạng tiền JPY', () => {
        const res = buildPaymentSuccessFlex(
          {
            packageName: 'プラチナ12ヶ月プラン',
            amount: 75000,
            paymentMethod: 'クレジットカード',
            paymentCode: 'TXN-998877',
          },
          'ja',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('お支払い完了')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('お支払いが完了しました')

        const bodyRows = (res.contents.body?.contents || []).slice(2) as LineFlexBox[]
        const amountRow = bodyRows.find((r) => (r.contents[0] as { text: string }).text === 'お支払い金額')
        expect((amountRow?.contents[1] as { text: string }).text).toBe('¥75,000')
      })
    })

    describe('10. buildFeedbackRespondedFlex', () => {
      it('VI locale', () => {
        const res = buildFeedbackRespondedFlex(
          {
            feedbackTitle: 'Đề xuất tăng tạ đơn',
            respondedAt: '23/08/2026',
            responderName: 'QL. Nguyễn Văn A',
          },
          'vi',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('ĐÃ CÓ PHẢN HỒI GÓP Ý')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Đã có phản hồi góp ý')
        expect(res.altText).toBe('[RoGym] Ban quản lý đã phản hồi góp ý của bạn')
      })

      it('JA locale', () => {
        const res = buildFeedbackRespondedFlex(
          {
            feedbackTitle: 'ダンベルの増設要望',
            respondedAt: '2026年8月23日',
            responderName: 'マネージャー',
          },
          'ja',
          liffUrl
        )
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('ご意見への返答')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('ご意見への返答が届きました')
        expect(res.altText).toBe('[RoGym] ご意見への返答が届きました')
      })
    })

    describe('11. buildWelcomeFlex', () => {
      it('VI locale', () => {
        const res = buildWelcomeFlex('vi', liffUrl)
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('CHÀO MỪNG HỘI VIÊN')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Chào mừng bạn đến với RoGym!')
        expect(res.altText).toBe('[RoGym] Chào mừng bạn đến với RoGym')
        const btn = res.contents.footer?.contents[0] as { action: { label: string } }
        expect(btn.action.label).toBe('Mở ứng dụng')
      })

      it('JA locale', () => {
        const res = buildWelcomeFlex('ja', liffUrl)
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('RoGymへようこそ')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('RoGymへようこそ！')
        expect(res.altText).toBe('[RoGym] RoGymへようこそ')
        const btn = res.contents.footer?.contents[0] as { action: { label: string } }
        expect(btn.action.label).toBe('アプリを開く')
      })
    })

    describe('12. buildHelpAutoReplyFlex', () => {
      it('VI locale', () => {
        const res = buildHelpAutoReplyFlex('vi', liffUrl)
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('HỖ TRỢ TỰ ĐỘNG')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('Trung tâm hỗ trợ RoGym')
        expect(res.altText).toBe('[RoGym] Trung tâm hỗ trợ tự động RoGym')
        const btn = res.contents.footer?.contents[0] as { action: { label: string } }
        expect(btn.action.label).toBe('Mở ứng dụng')
      })

      it('JA locale', () => {
        const res = buildHelpAutoReplyFlex('ja', liffUrl)
        const badgeText = ((res.contents.header?.contents[1] as LineFlexBox).contents[0] as { text: string }).text
        expect(badgeText).toBe('自動応答サポート')
        expect((res.contents.body?.contents[0] as { text: string }).text).toBe('RoGymサポートデスク')
        expect(res.altText).toBe('[RoGym] RoGym自動応答サポート')
        const btn = res.contents.footer?.contents[0] as { action: { label: string } }
        expect(btn.action.label).toBe('アプリを開く')
      })
    })
  })

  // =========================================================================
  // TẦNG 4: XỬ LÝ BIÊN & DỮ LIỆU RÁC (EDGE CASES & RUNTIME SAFETY)
  // =========================================================================
  describe('Tầng 4: Xử Lý Biên, Dữ Liệu Rác & An Toàn Runtime', () => {
    it('4.1 Xử lý dữ liệu undefined / chuỗi rỗng / khuyết thiếu cho toàn bộ builder ở cả 2 ngôn ngữ', () => {
      expect(() => {
        // Training created với các trường undefined (VI & JA)
        const cVi = buildTrainingBookingCreatedFlex(
          { sessionName: undefined, when: '', trainerName: '', roomName: '' },
          'vi',
          ''
        )
        expect(cVi.contents.body?.contents).toBeDefined()
        const cJa = buildTrainingBookingCreatedFlex(
          { sessionName: undefined, when: '', trainerName: '', roomName: '' },
          'ja',
          ''
        )
        expect(cJa.contents.body?.contents).toBeDefined()

        // Training updated với các trường undefined (VI & JA)
        const uVi = buildTrainingBookingUpdatedFlex(
          { sessionName: undefined, when: '', trainerName: '', roomName: '' },
          'vi',
          ''
        )
        expect(uVi.contents.body?.contents).toBeDefined()
        const uJa = buildTrainingBookingUpdatedFlex(
          { sessionName: undefined, when: '', trainerName: '', roomName: '' },
          'ja',
          ''
        )
        expect(uJa.contents.body?.contents).toBeDefined()

        // Training cancelled với các trường undefined (VI & JA)
        const xVi = buildTrainingBookingCancelledFlex(
          { sessionName: undefined, when: '', trainerName: '' },
          'vi',
          ''
        )
        expect(xVi.contents.body?.contents).toBeDefined()
        const xJa = buildTrainingBookingCancelledFlex(
          { sessionName: undefined, when: '', trainerName: '' },
          'ja',
          ''
        )
        expect(xJa.contents.body?.contents).toBeDefined()

        // Training reminder với default reminderMinutes và undefined fields (VI & JA)
        const rVi = buildTrainingReminderFlex(
          { sessionName: undefined, when: '', trainerName: '', roomName: '', reminderMinutes: undefined },
          'vi',
          ''
        )
        expect(rVi.contents.body?.contents).toBeDefined()
        const rJa = buildTrainingReminderFlex(
          { sessionName: undefined, when: '', trainerName: '', roomName: '', reminderMinutes: undefined },
          'ja',
          ''
        )
        expect(rJa.contents.body?.contents).toBeDefined()

        // Training starting (VI & JA)
        const sVi = buildTrainingStartingFlex(
          { sessionName: undefined, when: '', trainerName: '', roomName: '' },
          'vi',
          ''
        )
        expect(sVi.contents.body?.contents).toBeDefined()
        const sJa = buildTrainingStartingFlex(
          { sessionName: undefined, when: '', trainerName: '', roomName: '' },
          'ja',
          ''
        )
        expect(sJa.contents.body?.contents).toBeDefined()

        // Training completed không có roomName và có roomName (VI & JA)
        const compViNoRoom = buildTrainingCompletedFlex(
          { sessionName: undefined, when: '', trainerName: '', roomName: undefined },
          'vi',
          '',
          ''
        )
        expect(compViNoRoom.contents.body?.contents).toBeDefined()
        const compJaWithRoom = buildTrainingCompletedFlex(
          { sessionName: undefined, when: '', trainerName: '', roomName: 'Room X' },
          'ja',
          '',
          ''
        )
        expect(compJaWithRoom.contents.body?.contents).toBeDefined()

        // Attendance checkin không có branchName (VI & JA)
        const aVi = buildAttendanceCheckinFlex({ checkinTime: '', branchName: undefined }, 'vi', '')
        expect(aVi.contents.body?.contents).toBeDefined()
        const aJa = buildAttendanceCheckinFlex({ checkinTime: '', branchName: undefined }, 'ja', '')
        expect(aJa.contents.body?.contents).toBeDefined()

        // Subscription expiring không có packageName (VI & JA)
        const subVi = buildSubscriptionExpiringFlex(
          { packageName: '', endDate: '' },
          'vi',
          '',
          undefined
        )
        expect(subVi.contents.body?.contents).toBeDefined()
        const subJa = buildSubscriptionExpiringFlex(
          { packageName: '', endDate: '' },
          'ja',
          '',
          'https://rogym.vn/detail'
        )
        expect(subJa.contents.body?.contents).toBeDefined()

        // Payment success không có amount / paymentMethod / paymentCode / paidAt (VI & JA)
        const pVi = buildPaymentSuccessFlex(
          {
            packageName: '',
            amount: '',
            paymentMethod: undefined,
            paymentCode: undefined,
            paidAt: undefined,
          },
          'vi',
          ''
        )
        expect(pVi.contents.body?.contents).toBeDefined()
        const pJa = buildPaymentSuccessFlex(
          {
            packageName: '',
            amount: 0,
            paymentMethod: undefined,
            paymentCode: undefined,
            paidAt: '2026-08-23',
          },
          'ja',
          ''
        )
        expect(pJa.contents.body?.contents).toBeDefined()

        // Feedback responded không có feedbackTitle / responderName (VI & JA)
        const fVi = buildFeedbackRespondedFlex(
          {
            feedbackTitle: undefined,
            respondedAt: '',
            responderName: undefined,
          },
          'vi',
          ''
        )
        expect(fVi.contents.body?.contents).toBeDefined()
        const fJa = buildFeedbackRespondedFlex(
          {
            feedbackTitle: undefined,
            respondedAt: '',
            responderName: 'Admin',
          },
          'ja',
          ''
        )
        expect(fJa.contents.body?.contents).toBeDefined()
      }).not.toThrow()
    })

    it('4.2 Xử lý an toàn số tiền âm, số tiền bằng 0 và số tiền dạng chuỗi ký tự lạ', () => {
      expect(formatAmount(0, 'vi')).toBe('0 đ')
      expect(formatAmount(0, 'ja')).toBe('¥0')
      expect(formatAmount(-150000, 'vi')).toBe('-150.000 đ')
      expect(formatAmount(-5000, 'ja')).toBe('-¥5,000')
      expect(formatAmount('-150000', 'vi')).toBe('-150.000 đ')
      expect(formatAmount('-5000', 'ja')).toBe('-¥5,000')
      expect(formatAmount('5000', 'ja')).toBe('¥5,000')
      expect(formatAmount('150000', 'vi')).toBe('150.000 đ')
      expect(formatAmount('Miễn phí', 'vi')).toBe('Miễn phí')
      expect(formatAmount(Number.NaN, 'vi')).toBe('0 đ')
      expect(formatAmount(Number.NaN, 'ja')).toBe('¥0')
      expect(formatAmount(Number.POSITIVE_INFINITY, 'vi')).toBe('0 đ')
      expect(formatAmount(Number.POSITIVE_INFINITY, 'ja')).toBe('¥0')
    })

    it('4.3 Xử lý an toàn chuỗi độc hại XSS payload, SQL injection, Emoji và ký tự đặc biệt', () => {
      const xssPayload = '<script>alert("XSS")</script>'
      const sqlPayload = "' OR '1'='1"
      const emojiPayload = '🔥💪🏋️‍♂️ Special & < > " \' Characters'

      const msg = buildPaymentSuccessFlex(
        {
          packageName: `${xssPayload} ${emojiPayload}`,
          amount: 500000,
          paymentMethod: sqlPayload,
          paymentCode: '<code>TXN-123</code>',
          paidAt: '2026-08-23 <strong>10:00</strong>',
        },
        'vi',
        'https://rogym.vn'
      )

      expect(msg.type).toBe('flex')
      expect(msg.contents.type).toBe('bubble')
      expect(msg.altText).toContain(xssPayload)

      // Đảm bảo JSON serialize/parse hoàn toàn an toàn mà không sinh lỗi cú pháp
      const serialized = JSON.stringify(msg)
      const parsed = JSON.parse(serialized)
      expect(parsed.contents.body.contents).toBeDefined()
    })

    it('4.4 Cắt ngắn các chuỗi đầu vào quá dài không gây vỡ giao diện Flex', () => {
      const superLongString = 'X'.repeat(2000)
      const res = buildTrainingBookingCreatedFlex(
        {
          sessionName: superLongString,
          when: superLongString,
          trainerName: superLongString,
          roomName: superLongString,
        },
        'vi',
        `https://rogym.vn/${superLongString}`
      )

      expect(res.altText.length).toBeLessThanOrEqual(400)
      const primaryBtn = res.contents.footer?.contents[0] as { action: { label: string } }
      expect(primaryBtn.action.label.length).toBeLessThanOrEqual(40)
    })
  })
})
