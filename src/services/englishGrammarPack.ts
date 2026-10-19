export interface GrammarUnit {
  id: number
  title: string
  titleVi: string
  category: string
  explanation: string
  pattern: string
  example: { en: string; vi: string }
  caution: string
  exercise: { prompt: string; options: string[]; answer: number; explanation: string }
  theoryPage: number
  exercisePage: number
  keyPages: number[]
}
export interface EnglishGrammarGuide {
  version: 1
  source: { filename: string; pageCount: number; sha256: string }
  units: GrammarUnit[]
}
export interface EnglishGrammarPack extends EnglishGrammarGuide {
  kind: 'essential-grammar-personal'
  source: EnglishGrammarGuide['source'] & { dataBase64: string }
}
export interface EnglishGrammarCurriculum extends EnglishGrammarGuide {
  kind: 'essential-grammar-curriculum'
}

export async function loadEnglishGrammarCurriculum(): Promise<EnglishGrammarCurriculum> {
  const { default: data } = await import('@/data/essential-grammar-vi.json')
  return { ...data, kind: 'essential-grammar-curriculum', version: 1 }
}

function text(value: unknown, max = 2000): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}
const page = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max

export function parseEnglishGrammarPack(raw: string): EnglishGrammarPack {
  if (raw.length > 64 * 1024 * 1024)
    throw new Error('Bản học quá lớn. Hãy chọn gói Anh–Việt được tạo cho cuốn sách này.')
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('Không đọc được bản học. Hãy chọn đúng file .english-study.json.')
  }
  const pack = value as EnglishGrammarPack | null
  if (
    !pack ||
    pack.kind !== 'essential-grammar-personal' ||
    pack.version !== 1 ||
    !pack.source ||
    !text(pack.source.filename, 300) ||
    pack.source.pageCount !== 318 ||
    !text(pack.source.sha256, 64) ||
    !/^[a-f0-9]{64}$/.test(pack.source.sha256) ||
    !text(pack.source.dataBase64, 60 * 1024 * 1024) ||
    !pack.source.dataBase64.startsWith('JVBERi0') ||
    !Array.isArray(pack.units) ||
    pack.units.length !== 115
  )
    throw new Error(
      'Gói này không đúng định dạng Essential Grammar in Use, Fourth Edition (115 bài).',
    )
  const ids = new Set<number>()
  for (const unit of pack.units) {
    if (
      !unit ||
      !page(unit.id, 115) ||
      ids.has(unit.id) ||
      !text(unit.title, 300) ||
      !text(unit.titleVi, 300) ||
      !text(unit.category, 100) ||
      !text(unit.explanation) ||
      !text(unit.pattern) ||
      !text(unit.caution) ||
      !unit.example ||
      !text(unit.example.en) ||
      !text(unit.example.vi) ||
      !unit.exercise ||
      !text(unit.exercise.prompt) ||
      !text(unit.exercise.explanation) ||
      !Array.isArray(unit.exercise.options) ||
      unit.exercise.options.length < 2 ||
      unit.exercise.options.length > 5 ||
      !unit.exercise.options.every((option) => text(option, 300)) ||
      !Number.isInteger(unit.exercise.answer) ||
      unit.exercise.answer < 0 ||
      unit.exercise.answer >= unit.exercise.options.length ||
      !page(unit.theoryPage, 318) ||
      !page(unit.exercisePage, 318) ||
      !Array.isArray(unit.keyPages) ||
      !unit.keyPages.every((item) => page(item, 318))
    )
      throw new Error('Bản học có một Unit thiếu nội dung hoặc số trang không hợp lệ.')
    ids.add(unit.id)
  }
  return pack
}

export function grammarPackPdf(pack: EnglishGrammarPack): Blob {
  let decoded: string
  try {
    decoded = atob(pack.source.dataBase64)
  } catch {
    throw new Error('PDF trong bản học bị hỏng. Hãy chọn lại gói gốc.')
  }
  if (!decoded.startsWith('%PDF-')) throw new Error('Bản học không chứa PDF hợp lệ.')
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i)
  return new Blob([bytes], { type: 'application/pdf' })
}

export function filterGrammarUnits(units: GrammarUnit[], query: string) {
  const fold = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/đ/g, 'd')
  const needle = fold(query.trim())
  return units.filter((unit) =>
    fold(`${unit.id} ${unit.title} ${unit.titleVi} ${unit.category}`).includes(needle),
  )
}
