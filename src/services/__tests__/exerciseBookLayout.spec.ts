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

it('puts questions that share a listening file together and numbers them in the new order', async () => {
  const { audioBlocks } = await import('../exerciseBookLayout')
  const questions = [
    { exerciseKeywordId: 1, audioUrl: '/a', audioLabel: '練習 B1', contentNihongo: '<p>Đổi sang 〜んです。</p><p>例: …</p><p>山へ 行きます → ？</p>' },
    { exerciseKeywordId: 2, audioUrl: '/b', audioLabel: '練習 B2', contentNihongo: '<p>B2</p>' },
    { exerciseKeywordId: 3, audioUrl: '/a', audioLabel: '練習 B1', contentNihongo: '<p>Đổi sang 〜んです。</p><p>例: …</p><p>眠いです → ？</p>' },
    { exerciseKeywordId: 4, audioUrl: null, contentNihongo: '<p>x</p>' },
    { exerciseKeywordId: 5, audioUrl: null, contentNihongo: '<p>y</p>' },
  ]
  const blocks = audioBlocks(questions)
  expect(blocks.map(b => [b.audioUrl, b.label, b.shared, b.items.map(i => [i.exercise.exerciseKeywordId, i.index, i.content])])).toEqual([
    ['/a', '練習 B1', '<p>Đổi sang 〜んです。</p><p>例: …</p>', [[1, 0, '<p>山へ 行きます → ？</p>'], [3, 1, '<p>眠いです → ？</p>']]],
    ['/b', '練習 B2', '', [[2, 2, '<p>B2</p>']]],
    ['', '', '', [[4, 3, '<p>x</p>']]],
    ['', '', '', [[5, 4, '<p>y</p>']]],
  ])
  expect(questions.map(q => q.exerciseKeywordId)).toEqual([1, 2, 3, 4, 5])
})

it('drops a bare question number once the instruction is shared', async () => {
  const { audioBlocks } = await import('../exerciseBookLayout')
  const [block] = audioBlocks([1, 2].map(n => ({ exerciseKeywordId: n, audioUrl: '/m', contentNihongo: `<p>問題 1 – Nghe CD. Chọn câu trả lời phù hợp.</p><p>Câu ${n}</p>` })))
  expect(block!.shared).toBe('<p>問題 1 – Nghe CD. Chọn câu trả lời phù hợp.</p>')
  expect(block!.items.map(i => i.content)).toEqual(['', ''])
})
