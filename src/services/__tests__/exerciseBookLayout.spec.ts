import { expect, it } from 'vitest'
import { exerciseGroups, exerciseBookLayout, bookChoiceColumns } from '../exerciseBookLayout'
import layout from '@/data/try-n3-review-layout.json'

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
