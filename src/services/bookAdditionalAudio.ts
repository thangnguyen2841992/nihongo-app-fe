import audio from '@/data/try-n4-additional-audio.json'
export function bookAdditionalAudio(bookName?: string, name?: string) {
  if (!bookName?.startsWith('TRY! N4')) return []
  const entries = (audio as Record<string, { source: string; label: string }[]>)[name ?? ''] ?? []
  return entries.map(entry => ({ ...entry, source: `${import.meta.env.BASE_URL}${entry.source}` }))
}
