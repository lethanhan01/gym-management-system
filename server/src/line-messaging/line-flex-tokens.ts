/**
 * Hệ thống Design Tokens cho LINE Flex Message & Header Badge (RoGym Dark Theme)
 * Đồng bộ 100% với client/src/styles/tokens.css và client/src/components/ui/badge-utils.ts
 */

export type BadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'muted'

export interface BadgeToneConfig {
  textColor: string
  backgroundColor: string
  accentColor: string
}

export interface FlexTheme {
  bgCard: string
  bgElevated: string
  brandGreen: string
  brandTeal: string
  brandDark: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  borderSubtle: string
}

export const FLEX_THEME: FlexTheme = {
  bgCard: '#0f1c16',
  bgElevated: '#1a2520',
  brandGreen: '#06c384',
  brandTeal: '#42e09e',
  brandDark: '#00492f',
  textPrimary: '#ffffff',
  textSecondary: '#bbcabf',
  textMuted: '#8ab89c',
  borderSubtle: '#1a2520',
} as const

export const FLEX_BADGE_TONES: Record<BadgeTone, BadgeToneConfig> = {
  success: {
    textColor: '#42e09e',
    backgroundColor: '#1a3326',
    accentColor: '#06c384',
  },
  info: {
    textColor: '#7dd3fc',
    backgroundColor: '#0c2838',
    accentColor: '#38bdf8',
  },
  warning: {
    textColor: '#fcd34d',
    backgroundColor: '#2e2107',
    accentColor: '#fbbf24',
  },
  danger: {
    textColor: '#ff6b6b',
    backgroundColor: '#2d1212',
    accentColor: '#f87171',
  },
  muted: {
    textColor: '#bbcabf',
    backgroundColor: '#1a2520',
    accentColor: '#8ab89c',
  },
} as const
