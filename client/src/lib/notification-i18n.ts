import type { NotificationItem } from '@/services/notification.service'

interface NotificationText {
  title: string
  message: string
}

type Translate = (key: string, options?: Record<string, unknown>) => string
type Metadata = Record<string, unknown>

function metadataOf(value: unknown): Metadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Metadata
}

function stringValue(metadata: Metadata, key: string) {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function booleanValue(metadata: Metadata, key: string) {
  return typeof metadata[key] === 'boolean' ? metadata[key] : null
}

function fallback(item: NotificationItem): NotificationText {
  return { title: item.title, message: item.message }
}

function fixed(t: Translate, baseKey: string): NotificationText {
  return {
    title: t(`${baseKey}.title`),
    message: t(`${baseKey}.message`),
  }
}

function withPerson(
  item: NotificationItem,
  t: Translate,
  baseKey: string,
  memberMessageKey = 'memberMessage',
  trainerMessageKey = 'trainerMessage',
) {
  const metadata = metadataOf(item.metadata)
  const trainerName = stringValue(metadata, 'trainerName')
  if (trainerName) {
    return {
      title: t(`${baseKey}.title`),
      message: t(`${baseKey}.${memberMessageKey}`, { trainerName }),
    }
  }

  const memberName = stringValue(metadata, 'memberName')
  if (memberName) {
    return {
      title: t(`${baseKey}.title`),
      message: t(`${baseKey}.${trainerMessageKey}`, { memberName }),
    }
  }

  return fallback(item)
}

function subscription(item: NotificationItem, t: Translate, baseKey: string) {
  const metadata = metadataOf(item.metadata)
  const packageName = stringValue(metadata, 'packageName')
  if (!packageName) return fallback(item)

  return {
    title: t(`${baseKey}.title`),
    message: t(`${baseKey}.message`, { packageName }),
  }
}

export function translateNotification(item: NotificationItem, t: Translate): NotificationText {
  switch (item.type) {
    case 'training.created':
      return withPerson(item, t, 'notification.templates.training.created')
    case 'training.updated':
      return withPerson(item, t, 'notification.templates.training.updated')
    case 'training.cancelled':
      return withPerson(item, t, 'notification.templates.training.cancelled')
    case 'training.completed': {
      const metadata = metadataOf(item.metadata)
      const trainerName = stringValue(metadata, 'trainerName')
      if (!trainerName) return fallback(item)
      return {
        title: t('notification.templates.training.completed.title'),
        message: t('notification.templates.training.completed.memberMessage', { trainerName }),
      }
    }
    case 'attendance.checkin': {
      const metadata = metadataOf(item.metadata)
      const memberName = stringValue(metadata, 'memberName')
      return {
        title: t('notification.templates.attendance.checkin.title'),
        message: memberName
          ? t('notification.templates.attendance.checkin.trainerMessage', { memberName })
          : t('notification.templates.attendance.checkin.memberMessage'),
      }
    }
    case 'payment.success': {
      const metadata = metadataOf(item.metadata)
      const packageName = stringValue(metadata, 'packageName')
      if (!packageName) return fallback(item)
      const subscriptionActivated = booleanValue(metadata, 'subscriptionActivated')
      return {
        title: t(
          subscriptionActivated === false
            ? 'notification.templates.payment.success.pendingTitle'
            : 'notification.templates.payment.success.title',
        ),
        message: t(
          subscriptionActivated === false
            ? 'notification.templates.payment.success.pendingMessage'
            : 'notification.templates.payment.success.activatedMessage',
          { packageName },
        ),
      }
    }
    case 'payment.failed': {
      const metadata = metadataOf(item.metadata)
      const packageName = stringValue(metadata, 'packageName')
      if (!packageName) return fallback(item)
      return {
        title: t('notification.templates.payment.failed.title'),
        message: t('notification.templates.payment.failed.message', { packageName }),
      }
    }
    case 'payment.success.admin':
      return fixed(t, 'notification.templates.payment.successAdmin')
    case 'payment.failed.admin':
      return fixed(t, 'notification.templates.payment.failedAdmin')
    case 'subscription.created':
      return subscription(item, t, 'notification.templates.subscription.created')
    case 'subscription.renewed':
      return subscription(item, t, 'notification.templates.subscription.renewed')
    case 'subscription.cancelled':
      return subscription(item, t, 'notification.templates.subscription.cancelled')
    case 'subscription.created.admin':
      return fixed(t, 'notification.templates.subscription.createdAdmin')
    case 'subscription.renewed.admin':
      return fixed(t, 'notification.templates.subscription.renewedAdmin')
    case 'subscription.cancelled.admin':
      return fixed(t, 'notification.templates.subscription.cancelledAdmin')
    case 'feedback.created':
      return fixed(t, 'notification.templates.feedback.created')
    case 'feedback.assigned':
      return fixed(t, 'notification.templates.feedback.assigned')
    case 'feedback.resolved':
      return fixed(t, 'notification.templates.feedback.resolved')
    case 'feedback.rejected':
      return fixed(t, 'notification.templates.feedback.rejected')
    default:
      return fallback(item)
  }
}
