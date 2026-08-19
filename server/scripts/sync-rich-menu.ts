/**
 * RoGym LINE Rich Menu Automation Script
 * Synchronizes the 4-zone Member Rich Menu with the LINE Messaging API.
 *
 * Usage:
 *   npx ts-node scripts/sync-rich-menu.ts [--dry-run] [--image <path>]
 */
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment configurations
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

interface RichMenuArea {
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  action: {
    type: 'uri'
    label: string
    uri: string
  }
}

interface RichMenuObject {
  size: {
    width: number
    height: number
  }
  selected: boolean
  name: string
  chatBarText: string
  areas: RichMenuArea[]
}

function resolveLiffBaseUrl(): string {
  const envLiffUrl = process.env.LINE_LIFF_URL || process.env.VITE_LIFF_URL
  const envLiffId = process.env.LINE_LIFF_ID || process.env.VITE_LIFF_ID

  if (envLiffUrl && envLiffUrl.startsWith('http')) {
    return envLiffUrl.replace(/\/+$/, '')
  }

  if (envLiffId) {
    return `https://liff.line.me/${envLiffId}`
  }

  // Fallback for development/testing
  return 'https://liff.line.me/MOCK_LIFF_ID'
}

function buildRichMenuDefinition(liffBaseUrl: string): RichMenuObject {
  return {
    size: { width: 2500, height: 843 },
    selected: true,
    name: 'RoGym Member Menu',
    chatBarText: 'Mở menu RoGym',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: 'Lịch tập',
          uri: `${liffBaseUrl}?redirect=/member/workout/sessions`,
        },
      },
      {
        bounds: { x: 625, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: 'Đặt lịch',
          uri: `${liffBaseUrl}?redirect=${encodeURIComponent('/member/workout/sessions?book=1')}`,
        },
      },
      {
        bounds: { x: 1250, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: 'Check-in',
          uri: `${liffBaseUrl}?redirect=/member/check-in`,
        },
      },
      {
        bounds: { x: 1875, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: 'Hồ sơ',
          uri: `${liffBaseUrl}?redirect=/member/profile`,
        },
      },
    ],
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const imageArgIdx = args.indexOf('--image')
  const customImagePath = imageArgIdx >= 0 ? args[imageArgIdx + 1] : undefined

  console.log('====================================================')
  console.log('  RoGym LINE Rich Menu Sync Tool')
  console.log('====================================================\n')

  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const isMockEnabled = process.env.LINE_MOCK_ENABLED === 'true'
  const liffBaseUrl = resolveLiffBaseUrl()

  console.log(`[Config] LIFF Base URL:       ${liffBaseUrl}`)
  console.log(`[Config] Mock Mode:           ${isMockEnabled ? 'ENABLED' : 'DISABLED'}`)
  console.log(`[Config] Dry Run Mode:        ${isDryRun ? 'YES (No API Calls)' : 'NO'}`)

  const richMenuPayload = buildRichMenuDefinition(liffBaseUrl)
  console.log('\n[Rich Menu Structure]:')
  console.log(JSON.stringify(richMenuPayload, null, 2))

  if (isDryRun) {
    console.log('\n[Dry Run] Validation succeeded. Exiting without calling LINE API.')
    process.exit(0)
  }

  if (!channelAccessToken && !isMockEnabled) {
    console.error('\n[Error] LINE_CHANNEL_ACCESS_TOKEN is missing in environment variables.')
    console.error('Please configure LINE_CHANNEL_ACCESS_TOKEN in server/.env or run with --dry-run.')
    process.exit(1)
  }

  if (isMockEnabled) {
    console.log('\n[Mock Mode] Simulated successful Rich Menu creation and default assignment.')
    console.log('Rich Menu ID (mock): richmenu-mock-rogym-001')
    process.exit(0)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 1: Create Rich Menu on LINE Platform
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 1/3] Creating Rich Menu on LINE platform...')
  const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(richMenuPayload),
  })

  if (!createRes.ok) {
    const errorText = await createRes.text()
    console.error(`[Error] Failed to create rich menu (${createRes.status}): ${errorText}`)
    process.exit(1)
  }

  const createData = (await createRes.json()) as { richMenuId: string }
  const richMenuId = createData.richMenuId
  console.log(`✓ Rich Menu created with ID: ${richMenuId}`)

  // ───────────────────────────────────────────────────────────────────────────
  // Step 2: Upload Rich Menu Image
  // ───────────────────────────────────────────────────────────────────────────
  const imagePath =
    customImagePath || path.resolve(__dirname, '../../docs/assets/line/rich-menu-template.png')

  if (fs.existsSync(imagePath)) {
    console.log(`\n[Step 2/3] Uploading image from: ${imagePath}...`)
    const imageBuffer = fs.readFileSync(imagePath)
    const contentType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'

    const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': contentType,
      },
      body: imageBuffer,
    })

    if (!uploadRes.ok) {
      const uploadError = await uploadRes.text()
      console.error(`[Warning] Image upload failed (${uploadRes.status}): ${uploadError}`)
    } else {
      console.log('✓ Rich Menu image uploaded successfully.')
    }
  } else {
    console.log(`\n[Step 2/3] Image file not found at ${imagePath}. Skipping image upload.`)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step 3: Set as Default Rich Menu for All Users
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n[Step 3/3] Setting as default Rich Menu for all users...')
  const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
    },
  })

  if (!defaultRes.ok) {
    const defaultError = await defaultRes.text()
    console.error(`[Error] Failed to set default rich menu (${defaultRes.status}): ${defaultError}`)
    process.exit(1)
  }

  console.log('✓ Successfully set as default Rich Menu for all OA followers!')
  console.log('\n====================================================')
  console.log('  Rich Menu Synchronization Completed!')
  console.log(`  Rich Menu ID: ${richMenuId}`)
  console.log('====================================================')
}

void main()
