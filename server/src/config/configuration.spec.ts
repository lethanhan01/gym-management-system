import { validateConfig } from './configuration'

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/gym',
  JWT_SECRET: 'test-secret',
}

describe('validateConfig', () => {
  it('defaults LINE_MESSAGE_LOCALE to vi', () => {
    const config = validateConfig(baseEnv)

    expect(config.LINE_MESSAGE_LOCALE).toBe('vi')
  })

  it('accepts Japanese LINE message locale', () => {
    const config = validateConfig({ ...baseEnv, LINE_MESSAGE_LOCALE: 'ja' })

    expect(config.LINE_MESSAGE_LOCALE).toBe('ja')
  })

  it('rejects unsupported LINE message locales', () => {
    expect(() => validateConfig({ ...baseEnv, LINE_MESSAGE_LOCALE: 'en' })).toThrow(
      /LINE_MESSAGE_LOCALE/
    )
  })

  it('requires LINE messaging credentials and LIFF URL when messaging is enabled', () => {
    expect(() => validateConfig({ ...baseEnv, LINE_MESSAGING_ENABLED: 'true' })).toThrow(
      /LINE_CHANNEL_ACCESS_TOKEN[\s\S]*LINE_CHANNEL_SECRET[\s\S]*LINE_LIFF_URL/
    )
  })

  it('rejects LINE Developers Console URLs as LINE_LIFF_URL', () => {
    expect(() =>
      validateConfig({
        ...baseEnv,
        LINE_MESSAGING_ENABLED: 'true',
        LINE_CHANNEL_ACCESS_TOKEN: 'token',
        LINE_CHANNEL_SECRET: 'secret',
        LINE_LIFF_URL: 'https://developers.line.biz/console/channel/1/liff/1-test',
      })
    ).toThrow(/must not be a LINE Developers Console URL/)
  })

  it('requires a liff.line.me LIFF URL when LINE messaging is enabled', () => {
    expect(() =>
      validateConfig({
        ...baseEnv,
        LINE_MESSAGING_ENABLED: 'true',
        LINE_CHANNEL_ACCESS_TOKEN: 'token',
        LINE_CHANNEL_SECRET: 'secret',
        LINE_LIFF_URL: 'https://gym.example.com/liff',
      })
    ).toThrow(/https:\/\/liff\.line\.me\/<LIFF_ID>/)
  })
})
