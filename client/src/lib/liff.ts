import liff from '@line/liff'

let initialized = false

export async function initLiff(): Promise<typeof liff> {
  if (initialized) return liff
  const liffId = import.meta.env.VITE_LIFF_ID
  if (!liffId) throw new Error('VITE_LIFF_ID is not set')
  await liff.init({ liffId })
  initialized = true
  return liff
}

export { liff }
