import manifest from '@/data/try-n3-audio.json'

const tracksByBook = new Map<string, Map<string, string>>()
for (const reading of manifest.readings) {
  let tracks = tracksByBook.get(reading.bookName)
  if (!tracks) {
    tracks = new Map()
    tracksByBook.set(reading.bookName, tracks)
  }
  if (!tracks.has(reading.lessonName)) tracks.set(reading.lessonName, reading.track)
}

// Match both names so an unrelated book's first lesson cannot receive TRY! audio.
export function bookReadingAudioTrack(bookName?: string, lessonName?: string): string | undefined {
  if (bookName === undefined || lessonName === undefined) return undefined
  return tracksByBook.get(bookName)?.get(lessonName)
}
