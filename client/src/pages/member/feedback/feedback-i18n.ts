import i18n from '@/lib/i18n'

/**
 * Localizes a feedback quick tag using the translation resources in member.json (feedback.tagMap).
 * If a matching translation is found, returns the localized tag.
 * Otherwise, falls back to the original tag string.
 */
export function localizeTag(tag: string): string {
  if (!tag) return ''

  const t = i18n.t.bind(i18n) as (key: string, options?: { defaultValue?: string }) => string

  // Attempt direct translation via i18n
  const translated = t(`member:feedback.tagMap.${tag}`, { defaultValue: '' })
  if (translated && translated !== `member:feedback.tagMap.${tag}`) {
    return translated
  }

  // If tag starts with #, try without # and restore #
  if (tag.startsWith('#')) {
    const rawTag = tag.slice(1)
    const rawTranslated = t(`member:feedback.tagMap.${rawTag}`, { defaultValue: '' })
    if (rawTranslated && rawTranslated !== `member:feedback.tagMap.${rawTag}`) {
      return rawTranslated.startsWith('#') ? rawTranslated : `#${rawTranslated}`
    }
  } else {
    // If tag does not start with #, try with #
    const hashTag = `#${tag}`
    const hashTranslated = t(`member:feedback.tagMap.${hashTag}`, { defaultValue: '' })
    if (hashTranslated && hashTranslated !== `member:feedback.tagMap.${hashTag}`) {
      return hashTranslated.startsWith('#') ? hashTranslated.slice(1) : hashTranslated
    }
  }

  return tag
}
