import { expect, it } from 'vitest'
import {
  filterGrammarUnits,
  grammarPackPdf,
  loadEnglishGrammarCurriculum,
  parseEnglishGrammarPack,
} from '../englishGrammarPack'
import { grammarPackFixture } from './grammarPackFixture'

it('loads the complete built-in JSON with bilingual lessons and no embedded PDF', async () => {
  const guide = await loadEnglishGrammarCurriculum()
  expect(guide.kind).toBe('essential-grammar-curriculum')
  expect(guide.units.map((unit) => unit.id)).toEqual(
    Array.from({ length: 115 }, (_, index) => index + 1),
  )
  expect(
    guide.units.every(
      (unit) =>
        unit.example.vi && unit.explanation && unit.exercise.answer < unit.exercise.options.length,
    ),
  ).toBe(true)
  expect(guide.source).not.toHaveProperty('dataBase64')
})

it('opens a complete bilingual guide and produces only a local PDF blob', () => {
  const pack = parseEnglishGrammarPack(JSON.stringify(grammarPackFixture()))
  expect(pack.units).toHaveLength(115)
  expect(pack.units[114]!.theoryPage).toBe(239)
  expect(grammarPackPdf(pack).type).toBe('application/pdf')
})

it('rejects incomplete guides, duplicated IDs, missing translations and impossible answer/page references', () => {
  const mutations = [
    (pack: ReturnType<typeof grammarPackFixture>) => {
      pack.units.pop()
    },
    (pack: ReturnType<typeof grammarPackFixture>) => {
      pack.units[1]!.id = 1
    },
    (pack: ReturnType<typeof grammarPackFixture>) => {
      pack.units[0]!.example.vi = ''
    },
    (pack: ReturnType<typeof grammarPackFixture>) => {
      pack.units[0]!.exercise.answer = 5
    },
    (pack: ReturnType<typeof grammarPackFixture>) => {
      pack.units[0]!.theoryPage = 999
    },
    (pack: ReturnType<typeof grammarPackFixture>) => {
      pack.source.dataBase64 = 'aHRtbA=='
    },
  ]
  for (const mutate of mutations) {
    const pack = grammarPackFixture()
    mutate(pack)
    expect(() => parseEnglishGrammarPack(JSON.stringify(pack))).toThrow()
  }
  expect(() => parseEnglishGrammarPack('{broken')).toThrow('Không đọc được')
  expect(() =>
    grammarPackPdf({
      ...grammarPackFixture(),
      source: { ...grammarPackFixture().source, dataBase64: 'bad*' },
    }),
  ).toThrow('bị hỏng')
})

it('finds units using Vietnamese with or without accents and English keywords', () => {
  const units = grammarPackFixture().units
  expect(filterGrammarUnits(units, 'dong tu be').map((unit) => unit.id)).toEqual([1])
  expect(filterGrammarUnits(units, 'Hiện tại')).toHaveLength(115)
  expect(filterGrammarUnits(units, 'Grammar 115').map((unit) => unit.id)).toEqual([115])
  expect(filterGrammarUnits(units, 'no matching unit')).toHaveLength(0)
})
