import { parseSessionMarkdown } from '@shared/lib/parseSessionMarkdown.js'

/**
 * Read a .md file and return parsed session + optional conflict row.
 * @returns {Promise<{ ok: true, parsed: object } | { ok: false, errorMsg: string, conflictSession?: object, parsed?: object }>}
 */
export async function parseSessionImportMarkdownFile(file, {
  sessions,
  normalizeKey,
  slugify,
}) {
  if (!file || !String(file.name || '').toLowerCase().endsWith('.md')) {
    return { ok: false, errorMsg: 'Please select a .md file.' }
  }

  try {
    const markdown = await file.text()
    const result = parseSessionMarkdown(markdown)

    if (!result.sessionNumber && !result.sessionTitle) {
      return {
        ok: false,
        errorMsg: 'Could not detect a session structure in this document. Check that it follows the expected format.',
      }
    }

    const parsedTitleKey = normalizeKey(result.sessionTitle)
    const parsedChapterKey = normalizeKey(result.chapterSubtitle)
    const parsedSlug = slugify(result.sessionTitle)
    const conflict = sessions.find((s) => {
      const byNumber = result.sessionNumber != null && s.session_number === result.sessionNumber
      const byTitleKey = parsedTitleKey && normalizeKey(s.title) === parsedTitleKey
      const byChapterKey = parsedChapterKey && normalizeKey(s.subtitle) === parsedChapterKey
      const bySlug = parsedSlug && slugify(s.title) === parsedSlug
      return byNumber || byTitleKey || byChapterKey || bySlug
    })
    if (conflict) {
      return { ok: false, errorMsg: 'Session conflict', conflictSession: conflict, parsed: result }
    }

    return { ok: true, parsed: result }
  } catch (e) {
    return { ok: false, errorMsg: e.message || 'Failed to parse document.' }
  }
}
