import manifest from '@/data/try-n3-audio.json'

// Match both names so an unrelated book's first lesson cannot receive TRY! audio.
export function bookReadingAudioTrack(bookName?: string, lessonName?: string): string | undefined {
  return manifest.readings.find(reading => reading.bookName === bookName && reading.lessonName === lessonName)?.track
}
