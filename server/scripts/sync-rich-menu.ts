/**
 * RoGym Dynamic Switch LINE Rich Menu Automation Script
 * Synchronizes 2-tier Dynamic Rich Menu (Main <-> Sub) with LINE Messaging API.
 *
 * Usage:
 *   npx ts-node scripts/sync-rich-menu.ts [--dry-run] [--locale ja|vi] [--clean]
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
  action:
    | {
        type: 'uri'
        label: string
        uri: string
      }
    | {
        type: 'richMenuSwitch'
        richMenuAliasId: string
        data: string
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

const MAIN_ALIAS = 'rogym-alias-main'
const SUB_ALIAS = 'rogym-alias-sub'

function resolveLiffBaseUrl(): string {
  const envLiffUrl = process.env.LINE_LIFF_URL || process.env.VITE_LIFF_URL
  const envLiffId = process.env.LINE_LIFF_ID || process.env.VITE_LIFF_ID

  if (envLiffUrl && envLiffUrl.startsWith('http')) {
    return envLiffUrl.replace(/\/+$/, '')
  }

  if (envLiffId) {
    return `https://liff.line.me/${envLiffId}`
  }

  return 'https://liff.line.me/MOCK_LIFF_ID'
}

function buildMainRichMenuDefinition(liffBaseUrl: string, locale: 'ja' | 'vi' = 'ja'): RichMenuObject {
  const isJa = locale === 'ja'
  return {
    size: { width: 2500, height: 843 },
    selected: true,
    name: `RoGym Main Menu (${locale.toUpperCase()})`,
    chatBarText: isJa ? 'RoGymメニュー' : 'Mở menu RoGym',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: isJa ? 'スケジュール' : 'Lịch tập',
          uri: `${liffBaseUrl}?redirect=/member/workout/sessions`,
        },
      },
      {
        bounds: { x: 625, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: isJa ? 'PT予約' : 'Đặt lịch',
          uri: `${liffBaseUrl}?redirect=${encodeURIComponent('/member/workout/sessions?book=1')}`,
        },
      },
      {
        bounds: { x: 1250, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: isJa ? 'チェックイン' : 'Check-in',
          uri: `${liffBaseUrl}?redirect=/member/check-in`,
        },
      },
      {
        bounds: { x: 1875, y: 0, width: 625, height: 843 },
        action: {
          type: 'richMenuSwitch',
          richMenuAliasId: SUB_ALIAS,
          data: 'action=open_sub_menu',
        },
      },
    ],
  }
}

function buildSubRichMenuDefinition(liffBaseUrl: string, locale: 'ja' | 'vi' = 'ja'): RichMenuObject {
  const isJa = locale === 'ja'
  return {
    size: { width: 2500, height: 843 },
    selected: false,
    name: `RoGym Sub Menu (${locale.toUpperCase()})`,
    chatBarText: isJa ? 'サブメニュー' : 'Menu phụ',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: isJa ? '契約プラン' : 'Gói tập',
          uri: `${liffBaseUrl}?redirect=/member/subscriptions/current`,
        },
      },
      {
        bounds: { x: 625, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: isJa ? 'フィードバック' : 'Đánh giá',
          uri: `${liffBaseUrl}?redirect=/member/feedback`,
        },
      },
      {
        bounds: { x: 1250, y: 0, width: 625, height: 843 },
        action: {
          type: 'uri',
          label: isJa ? 'マイページ' : 'Hồ sơ',
          uri: `${liffBaseUrl}?redirect=/member/profile`,
        },
      },
      {
        bounds: { x: 1875, y: 0, width: 625, height: 843 },
        action: {
          type: 'richMenuSwitch',
          richMenuAliasId: MAIN_ALIAS,
          data: 'action=open_main_menu',
        },
      },
    ],
  }
}

async function uploadImage(richMenuId: string, imagePath: string, channelAccessToken: string) {
  if (!fs.existsSync(imagePath)) {
    console.error(`\n[Error] Image file not found at: ${imagePath}`)
    console.error('LINE Messaging API requires a valid PNG or JPEG image (2500x843) to be uploaded.')
    process.exit(1)
  }

  console.log(`[Upload] Uploading image from: ${imagePath}...`)
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
    console.error(`[Error] Image upload failed for ${richMenuId} (${uploadRes.status}): ${uploadError}`)
    process.exit(1)
  }
  console.log(`✓ Image uploaded successfully for Rich Menu ${richMenuId}`)
}

async function upsertAlias(aliasId: string, richMenuId: string, channelAccessToken: string) {
  const updateRes = await fetch(`https://api.line.me/v2/bot/richmenu/alias/${aliasId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ richMenuId }),
  })

  if (updateRes.ok) {
    console.log(`✓ Updated Alias '${aliasId}' -> ${richMenuId}`)
    return
  }

  const createAliasRes = await fetch('https://api.line.me/v2/bot/richmenu/alias', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ richMenuAliasId: aliasId, richMenuId }),
  })

  if (!createAliasRes.ok) {
    const errText = await createAliasRes.text()
    console.warn(`[Warning] Failed to set Alias '${aliasId}' (${createAliasRes.status}): ${errText}`)
  } else {
    console.log(`✓ Created Alias '${aliasId}' -> ${richMenuId}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')

  const localeArgIdx = args.indexOf('--locale')
  const localeRaw = localeArgIdx >= 0 ? args[localeArgIdx + 1] : 'ja'
  const locale: 'ja' | 'vi' = localeRaw === 'vi' ? 'vi' : 'ja'

  console.log('====================================================')
  console.log('  RoGym LINE Dynamic Switch Rich Menu Sync Tool')
  console.log('====================================================\n')

  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const isMockEnabled = process.env.LINE_MOCK_ENABLED === 'true'
  const liffBaseUrl = resolveLiffBaseUrl()

  console.log(`[Config] LIFF Base URL:       ${liffBaseUrl}`)
  console.log(`[Config] Target Locale:       ${locale.toUpperCase()}`)
  console.log(`[Config] Mock Mode:           ${isMockEnabled ? 'ENABLED' : 'DISABLED'}`)
  console.log(`[Config] Dry Run Mode:        ${isDryRun ? 'YES (No API Calls)' : 'NO'}`)

  const mainPayload = buildMainRichMenuDefinition(liffBaseUrl, locale)
  const subPayload = buildSubRichMenuDefinition(liffBaseUrl, locale)

  console.log('\n[Main Rich Menu Structure]:')
  console.log(JSON.stringify(mainPayload, null, 2))

  console.log('\n[Sub Rich Menu Structure]:')
  console.log(JSON.stringify(subPayload, null, 2))

  if (isDryRun) {
    console.log('\n[Dry Run] Dynamic Switch Rich Menu validation succeeded. Exiting without calling LINE API.')
    process.exit(0)
  }

  if (!channelAccessToken && !isMockEnabled) {
    console.error('\n[Error] LINE_CHANNEL_ACCESS_TOKEN is missing in environment variables.')
    console.error('Please configure LINE_CHANNEL_ACCESS_TOKEN in server/.env or run with --dry-run.')
    process.exit(1)
  }

  if (isMockEnabled) {
    console.log('\n[Mock Mode] Simulated successful Dynamic Switch Rich Menu creation.')
    console.log('Main Rich Menu ID (mock): richmenu-mock-main-001')
    console.log('Sub Rich Menu ID (mock):  richmenu-mock-sub-002')
    console.log(`Main Alias: ${MAIN_ALIAS} -> richmenu-mock-main-001`)
    console.log(`Sub Alias:  ${SUB_ALIAS} -> richmenu-mock-sub-002`)
    process.exit(0)
  }

  const token = channelAccessToken!

  // Step 1: Create Main Rich Menu
  console.log('\n[Step 1/5] Creating Main Rich Menu on LINE platform...')
  const mainRes = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(mainPayload),
  })
  if (!mainRes.ok) {
    console.error(`[Error] Failed to create main rich menu (${mainRes.status}): ${await mainRes.text()}`)
    process.exit(1)
  }
  const mainData = (await mainRes.json()) as { richMenuId: string }
  const mainRichMenuId = mainData.richMenuId
  console.log(`✓ Main Rich Menu created with ID: ${mainRichMenuId}`)

  // Step 2: Create Sub Rich Menu
  console.log('\n[Step 2/5] Creating Sub Rich Menu on LINE platform...')
  const subRes = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(subPayload),
  })
  if (!subRes.ok) {
    console.error(`[Error] Failed to create sub rich menu (${subRes.status}): ${await subRes.text()}`)
    process.exit(1)
  }
  const subData = (await subRes.json()) as { richMenuId: string }
  const subRichMenuId = subData.richMenuId
  console.log(`✓ Sub Rich Menu created with ID: ${subRichMenuId}`)

  // Step 3: Upload Images
  console.log('\n[Step 3/5] Uploading images...')
  const mainImagePath = path.resolve(__dirname, `../../docs/assets/line/rich-menu-template-${locale}.png`)
  const subImagePath = path.resolve(__dirname, `../../docs/assets/line/rich-menu-template-sub-${locale}.png`)

  await uploadImage(mainRichMenuId, mainImagePath, token)
  await uploadImage(subRichMenuId, subImagePath, token)

  // Step 4: Register Aliases
  console.log('\n[Step 4/5] Registering Rich Menu Aliases...')
  await upsertAlias(MAIN_ALIAS, mainRichMenuId, token)
  await upsertAlias(SUB_ALIAS, subRichMenuId, token)

  // Step 5: Set Main Rich Menu as Default
  console.log('\n[Step 5/5] Setting Main Rich Menu as default for all users...')
  const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${mainRichMenuId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!defaultRes.ok) {
    console.error(`[Error] Failed to set default rich menu (${defaultRes.status}): ${await defaultRes.text()}`)
    process.exit(1)
  }
  console.log('✓ Successfully set Main Rich Menu as default!')

  console.log('\n====================================================')
  console.log('  Dynamic Switch Rich Menu Synchronization Completed!')
  console.log(`  Main Rich Menu ID: ${mainRichMenuId}`)
  console.log(`  Sub Rich Menu ID:  ${subRichMenuId}`)
  console.log(`  Main Alias:        ${MAIN_ALIAS}`)
  console.log(`  Sub Alias:         ${SUB_ALIAS}`)
  console.log('====================================================')
}

void main()
