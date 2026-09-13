import { describe, expect, it } from 'vitest'
import { localizeTag } from './feedback-i18n'
import i18n from '@/lib/i18n'

describe('localizeTag', () => {
  it('returns original tag when in Vietnamese', async () => {
    await i18n.changeLanguage('vi')

    expect(localizeTag('#ChuyênMônCao')).toBe('#ChuyênMônCao')
    expect(localizeTag('Nhiệt tình')).toBe('Nhiệt tình')
  })

  it('translates tags to Japanese when in Japanese', async () => {
    await i18n.changeLanguage('ja')

    expect(localizeTag('#ChuyênMônCao')).toBe('#高い専門性')
    expect(localizeTag('#NhiệtTìnhTậnTâm')).toBe('#親切・熱心')
    expect(localizeTag('Nhiệt tình')).toBe('親切・熱心')
    expect(localizeTag('Chuyên nghiệp')).toBe('プロフェッショナル')
  })

  it('handles tag prefix # automatically and falls back gracefully for unknown tags', async () => {
    await i18n.changeLanguage('ja')

    // Tag has # but dictionary has without #
    expect(localizeTag('#Sạch sẽ')).toBe('#清潔')

    // Unknown custom tag falls back to itself
    expect(localizeTag('#CustomTag123')).toBe('#CustomTag123')
    expect(localizeTag('')).toBe('')
  })
})
