import liff from '@line/liff'

let initialized = false
let mockPluginInstalled = false

export const LIFF_MOCK_ID_TOKEN = 'rogym-liff-mock-member-token'
export const isLiffMockEnabled = import.meta.env.DEV && import.meta.env.VITE_LIFF_MOCK === 'true'

async function configureLiffMock() {
  if (mockPluginInstalled) return

  const { LiffMockPlugin } = await import('@line/liff-mock')
  liff.use(new LiffMockPlugin())
  liff.$mock.set({
    isLoggedIn: true,
    getIDToken: LIFF_MOCK_ID_TOKEN,
    getDecodedIDToken: {
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    } as NonNullable<ReturnType<typeof liff.getDecodedIDToken>>,
    getLanguage: 'vi',
    getProfile: {
      displayName: 'LIFF Mock Member',
      userId: 'rogym-liff-mock-member',
      statusMessage: 'Local development profile',
    },
  })
  mockPluginInstalled = true
}

export async function initLiff(): Promise<typeof liff> {
  if (initialized) return liff

  try {
    const liffId = import.meta.env.VITE_LIFF_ID
    if (!liffId) throw new Error('VITE_LIFF_ID is not set')

    if (isLiffMockEnabled) {
      await configureLiffMock()
      await liff.init({ liffId, mock: true })
    } else {
      await liff.init({ liffId })
    }
    initialized = true
    return liff
  } catch (error) {
    initialized = false // Allow retry
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`LIFF init failed: ${errorMessage}`)
  }
}

export { liff }
