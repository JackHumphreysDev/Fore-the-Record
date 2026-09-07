import { describe, expect, it } from 'vitest'
import { formatWhatsNewDate, WHATS_NEW_ENTRIES } from './whatsNewData.ts'

describe('What’s New entries', () => {
  it('keeps entries newest first with valid unique dates and identifiers', () => {
    const identifiers = new Set<string>()

    WHATS_NEW_ENTRIES.forEach((entry, index) => {
      expect(entry.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(`${entry.publishedAt}T00:00:00Z`))).toBe(false)
      expect(identifiers.has(entry.id)).toBe(false)
      expect(entry.highlights.length).toBeGreaterThanOrEqual(1)
      identifiers.add(entry.id)

      if (index > 0) {
        expect(entry.publishedAt <= WHATS_NEW_ENTRIES[index - 1].publishedAt).toBe(true)
      }
    })
  })

  it('contains plain player-facing copy without versions or internal notes', () => {
    const visibleCopy = WHATS_NEW_ENTRIES.flatMap((entry) => [
      entry.title,
      entry.summary,
      ...entry.highlights,
    ]).join(' ')

    expect(visibleCopy).not.toMatch(/\b\d+\.\d+\.\d+\b/)
    expect(visibleCopy).not.toMatch(
      /\b(?:API|database|dependency|migration|Prisma|Supabase|credential|infrastructure)\b/i,
    )
  })

  it('formats release dates for players', () => {
    expect(formatWhatsNewDate('2026-09-07')).toBe('7 September 2026')
  })
})
