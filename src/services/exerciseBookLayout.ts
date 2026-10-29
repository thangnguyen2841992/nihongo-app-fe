import layout from '@/data/try-n3-review-layout.json'
import chapterTwo from '@/data/try-n3-chapter-2-layout.json'
import tryN4 from '@/data/try-n4-review-layout.json'

interface BookSection {
  number: number; typeName: string; title: string; vietnameseTitle: string; instruction: string;
  sourcePrintedPages: string; questionCount: number; reading?: string; choiceColumns?: number[]
  answersReviewed?: boolean; sourceImages?: string[]; aiAnswerCount?: number; pendingAnswerCount?: number
}
const additional = Object.values(import.meta.glob<{ sections: BookSection[] }>('../data/try-n3-chapter-*-layout.json', { eager: true, import: 'default' }))
const sections: BookSection[] = [...layout.sections, ...additional.flatMap(chapter => chapter.sections), ...tryN4.sections]
const sectionsByType = new Map<string, BookSection>()
for (const section of sections) {
  // Preserve the first matching section when imported manifests overlap.
  if (!sectionsByType.has(section.typeName)) sectionsByType.set(section.typeName, section)
}
const chapterTwoTypes = new Set(chapterTwo.sections.map(section => section.typeName))

export function exerciseBookLayout(typeName?: string) {
  return typeName === undefined ? undefined : sectionsByType.get(typeName)
}
export function bookAnswersPending(typeName?: string) {
  return exerciseBookLayout(typeName)?.answersReviewed === false
}
export function bookChoiceColumns(typeName: string, questionIndex: number, choiceCount = 4): number {
  const section = exerciseBookLayout(typeName)
  if (!section) return 2
  if (section.title === '聴解') return choiceCount
  if (section.choiceColumns) return section.choiceColumns[questionIndex] ?? 4
  if (chapterTwoTypes.has(typeName)) return section.number === 3 && questionIndex !== 2 ? 2 : 4
  if (section.number === 1 && [2, 6, 7].includes(questionIndex)) return 2
  if (section.number === 3 && questionIndex === 2) return 2
  return 4
}
export const tryN3Listening = layout.listening
const listeningGroups = [['04','05'],['06'],['14','15'],['16'],['26'],['27','28','29','30'],['50','51'],['52'],['55'],['56','57','58'],['61'],['62','63','64']]
const listeningItems = new Map(listeningGroups.flatMap((tracks, group) =>
  tracks.map((track, index) => [track, { part: group % 2 + 1, item: index + 1 }] as const)))
export function bookListeningItem(track?: string): { part: number; item: number } | undefined {
  const item = track === undefined ? undefined : listeningItems.get(track)
  return item ? { ...item } : undefined
}
export function bookAudioTrack(typeName: string | undefined, content: string): string | undefined {
  // N4 uses its imported audio assets; never fall back to the N3 CD with the same number.
  if (typeName?.startsWith('TRY! N4')) return undefined
  if (exerciseBookLayout(typeName)?.title !== '聴解') return undefined
  const match = /^CD (0[1-9]|[1-5][0-9]|6[0-4])$/.exec(content.trim())
  return match?.[1]
}

export function exerciseGroups<T extends { exerciseTypeId: number; exerciseTypeName: string }>(exercises: T[], types: { exerciseTypeId: number; name: string }[]) {
  const typeNames = new Map<number, string>()
  for (const type of types) {
    if (!typeNames.has(type.exerciseTypeId)) typeNames.set(type.exerciseTypeId, type.name)
  }
  const groups = new Map<number, { exerciseTypeId: number; exerciseTypeName: string; exercises: T[] }>()
  for (const exercise of exercises) {
    if (!exercise.exerciseTypeId) continue
    let group = groups.get(exercise.exerciseTypeId)
    if (!group) {
      group = { exerciseTypeId: exercise.exerciseTypeId,
        exerciseTypeName: exercise.exerciseTypeName || typeNames.get(exercise.exerciseTypeId) || 'Bài tập', exercises: [] }
      groups.set(exercise.exerciseTypeId, group)
    }
    group.exercises.push(exercise)
  }
  return [...groups.values()].sort((a, b) => {
    const left = exerciseBookLayout(a.exerciseTypeName)
    const right = exerciseBookLayout(b.exerciseTypeName)
    return left && right ? left.number - right.number : a.exerciseTypeId - b.exerciseTypeId
  })
}

export interface AudioBlock<T> {
  key: string
  /** Shared listening file of every question in the block; empty for questions without an uploaded file. */
  audioUrl: string
  label: string
  /** Opening paragraphs (instruction, worked example) that every question of the block repeats; shown once. */
  shared: string
  /** `content` is the question without the shared paragraphs. */
  items: { exercise: T; index: number; content: string }[]
}

const paragraphs = (html: string) => html.match(/<p\b[^>]*>[\s\S]*?<\/p>/g) ?? (html.trim() ? [html] : [])
/** "Câu 3" only numbers a question that is otherwise just its choices; the page numbers questions itself. */
const numberOnly = /^<p\b[^>]*>\s*Câu \d+\s*<\/p>$/

/**
 * Puts the questions of one exercise group that play the same listening file together, in the order the first of
 * them appears, so the page shows one player per file instead of one per question. `index` is the question's
 * position in the regrouped list (used for numbering). Questions without an uploaded file stay on their own.
 */
export function audioBlocks<T extends { exerciseKeywordId: number; audioUrl?: string | null; audioLabel?: string | null; contentNihongo?: string | null }>(exercises: T[]): AudioBlock<T>[] {
  const blocks: AudioBlock<T>[] = []
  const byUrl = new Map<string, AudioBlock<T>>()
  for (const exercise of exercises) {
    const url = exercise.audioUrl || ''
    let block = url ? byUrl.get(url) : undefined
    if (!block) {
      block = { key: url || `q-${exercise.exerciseKeywordId}`, audioUrl: url, label: exercise.audioLabel || '', shared: '', items: [] }
      blocks.push(block)
      if (url) byUrl.set(url, block)
    }
    block.items.push({ exercise, index: 0, content: exercise.contentNihongo || '' })
  }
  let index = 0
  for (const block of blocks) {
    for (const item of block.items) item.index = index++
    if (block.items.length < 2) continue
    const parts = block.items.map(item => paragraphs(item.content))
    let common = 0
    while (parts.every(p => p.length > common && p[common] === parts[0]![common])) common++
    if (!common) continue
    block.shared = parts[0]!.slice(0, common).join('')
    block.items.forEach((item, i) => { item.content = parts[i]!.slice(common).filter(p => !numberOnly.test(p)).join('') })
  }
  return blocks
}
