import { expect, it } from 'vitest'
import { exerciseGroups, exerciseBookLayout, bookChoiceColumns, bookListeningItem } from '../exerciseBookLayout'
import layout from '@/data/try-n3-review-layout.json'
import manifest from '@/data/try-n3-audio.json'
import { bookReadingAudioTrack } from '../bookReadingAudio'
import { bookLessonOrder } from '../bookLessonOrder'

it('retains listening track positions and returns independent results', () => {
  expect(bookListeningItem('04')).toEqual({ part: 1, item: 1 })
  expect(bookListeningItem('30')).toEqual({ part: 2, item: 4 })
  expect(bookListeningItem('99')).toBeUndefined()
  const item = bookListeningItem('04')!
  item.part = 99
  expect(bookListeningItem('04')!.part).toBe(1)
})

it('sorts numbered lessons without mutating the input or reordering unrelated lessons', () => {
  const lessons = [{ name: '10. Bài mười' }, { name: '02. Bài hai' }]
  expect(bookLessonOrder(lessons).map(lesson => lesson.name)).toEqual(['02. Bài hai', '10. Bài mười'])
  expect(lessons[0]!.name).toBe('10. Bài mười')
  const unrelated = [{ name: 'Bài B' }, { name: 'Bài A' }]
  expect(bookLessonOrder(unrelated)).toBe(unrelated)
})

it('keeps audio scoped to both book and lesson', () => {
  const reading = manifest.readings[0]!
  expect(bookReadingAudioTrack(reading.bookName, reading.lessonName)).toBe(reading.track)
  expect(bookReadingAudioTrack('Other book', reading.lessonName)).toBeUndefined()
  expect(bookReadingAudioTrack(reading.bookName, 'Other lesson')).toBeUndefined()
  expect(bookReadingAudioTrack()).toBeUndefined()
})

it('uses the first type name and skips questions without a type', () => {
  const questions = [
    { exerciseTypeId: 5, exerciseTypeName: '' },
    { exerciseTypeId: 0, exerciseTypeName: 'No type' },
  ]
  const groups = exerciseGroups(questions, [
    { exerciseTypeId: 5, name: 'First' },
    { exerciseTypeId: 5, name: 'Duplicate' },
  ])
  expect(groups).toHaveLength(1)
  expect(groups[0]!.exerciseTypeName).toBe('First')
  expect(exerciseBookLayout()).toBeUndefined()
})

it('shows only groups belonging to the current lesson and keeps book section order', () => {
  const types = [{ exerciseTypeId: 1, name: 'Unrelated empty type' }]
  const questions = [
    { exerciseTypeId: 9, exerciseTypeName: layout.sections[2]!.typeName },
    { exerciseTypeId: 20, exerciseTypeName: layout.sections[0]!.typeName },
    { exerciseTypeId: 7, exerciseTypeName: layout.sections[1]!.typeName },
  ]
  expect(exerciseGroups(questions, types).map(g => exerciseBookLayout(g.exerciseTypeName)?.number)).toEqual([1, 2, 3])
  expect(exerciseGroups([], types)).toEqual([])
})

it('retains a shared passage for the four cloze questions and original choice rows', () => {
  const cloze = exerciseBookLayout(layout.sections[2]!.typeName)!
  expect(cloze.reading).toContain('水族館')
  expect(cloze.reading?.match(/［[1-4]］/g)).toHaveLength(4)
  expect(bookChoiceColumns(layout.sections[0]!.typeName, 0)).toBe(4)
  expect(bookChoiceColumns(layout.sections[0]!.typeName, 2)).toBe(2)
})
