export const englishBooks = [
  {
    id: 'essential-grammar',
    title: 'Essential Grammar in Use',
    author: 'Raymond Murphy',
    skill: 'Ngữ pháp',
    icon: 'bi-journal-text',
    color: 'grammar',
    description: 'Đọc một điểm ngữ pháp, tự đặt ví dụ và ghi lại điều bạn hay nhầm.',
    resourceUrl: 'https://shop.cambridge.org/english/product/2800506037',
    resourceLabel: 'eBook & audio chính thức',
    resourceNote: 'Bản eBook được truy cập qua Cambridge One sau khi mua và kích hoạt.',
    notePrompt: 'Cấu trúc mới, ví dụ của mình, lỗi cần tránh…',
    studySteps: [
      'Đọc giải thích và ví dụ trong sách.',
      'Tự đặt 3 câu về cuộc sống của bạn.',
      'Làm bài tập, kiểm tra đáp án rồi ghi lại lỗi sai.',
    ],
  },
  {
    id: 'elementary-vocabulary',
    title: 'English Vocabulary in Use – Elementary',
    author: 'Michael McCarthy & Felicity O’Dell',
    skill: 'Từ vựng',
    icon: 'bi-collection',
    color: 'vocabulary',
    description: 'Học từ theo chủ đề và dùng chúng trong những câu gần gũi với bạn.',
    resourceUrl: 'https://shop.cambridge.org/english/product/2800506034',
    resourceLabel: 'eBook & audio chính thức',
    resourceNote: 'Bản eBook được truy cập qua Cambridge One sau khi mua và kích hoạt.',
    notePrompt: 'Từ / cụm từ • nghĩa • câu ví dụ của mình…',
    studySteps: [
      'Chọn một chủ đề và nghe cách đọc các từ.',
      'Ghi cả cụm từ cùng một câu ví dụ của bạn.',
      'Che nghĩa để tự nhớ lại và ôn lại vào ngày hôm sau.',
    ],
  },
  {
    id: 'tree-or-three',
    title: 'Tree or Three?',
    author: 'Ann Baker',
    skill: 'Phát âm',
    icon: 'bi-soundwave',
    color: 'pronunciation',
    description: 'Nghe kỹ từng âm, luyện vị trí miệng và đọc lại những cặp từ dễ nhầm.',
    resourceUrl: 'https://www.cambridge.org/treeorthree',
    resourceLabel: 'Sách & tài nguyên Cambridge',
    resourceNote:
      'Mở trang nhà xuất bản để xem sách và tài nguyên đi kèm. Trang này chưa có bản sách đầy đủ.',
    sampleUrl:
      'https://assets.cambridge.org/97805216/85276/frontmatter/9780521685276_frontmatter.pdf',
    notePrompt: 'Âm đang luyện • vị trí miệng • từ dễ nhầm • điều cần sửa…',
    studySteps: [
      'Nghe một lượt trước khi nhìn vào từ.',
      'Luyện từng âm rồi đọc các cặp từ trong sách.',
      'Nghe lại, đọc theo và ghi chú âm bạn còn dễ nhầm.',
    ],
  },
] as const

export type EnglishBookId = (typeof englishBooks)[number]['id']
export interface EnglishStudyEntry {
  page: number
  currentUnit: string
  completedUnits: number
  totalUnits: number
  notes: string
  /** Units the learner marked as finished (used by the built-in grammar course). */
  doneUnits: number[]
  /** Last self-check result per unit id: true = answered correctly. */
  quiz: Record<string, boolean>
}
export type EnglishStudyRecord = Record<EnglishBookId, EnglishStudyEntry>
export interface LocalStudyMedia {
  name: string
  url: string
  /** The file itself, kept so it can be remembered on this device when the learner asks for it. */
  blob?: Blob
}

export function emptyEnglishStudy(): EnglishStudyRecord {
  return Object.fromEntries(
    englishBooks.map((book) => [
      book.id,
      {
        page: 1,
        currentUnit: '',
        completedUnits: 0,
        totalUnits: 0,
        notes: '',
        doneUnits: [],
        quiz: {},
      },
    ]),
  ) as EnglishStudyRecord
}

function storageKey(email: string) {
  const identity = email.trim().toLowerCase()
  if (!identity) throw new Error('Hãy đăng nhập lại để lưu ghi chú đúng tài khoản.')
  return `english-self-study:v1:${encodeURIComponent(identity)}`
}

const integer = (value: unknown, fallback: number, min = 0) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= 100000
    ? value
    : fallback

export function normalizeRecord(value: unknown): EnglishStudyRecord {
  const result = emptyEnglishStudy()
  if (!value || typeof value !== 'object') return result
  for (const book of englishBooks) {
    const entry = (value as Record<string, unknown>)[book.id]
    if (!entry || typeof entry !== 'object') continue
    const data = entry as Record<string, unknown>
    const totalUnits = integer(data.totalUnits, 0)
    const completedUnits = integer(data.completedUnits, 0)
    result[book.id] = {
      page: integer(data.page, 1, 1),
      currentUnit: typeof data.currentUnit === 'string' ? data.currentUnit.slice(0, 200) : '',
      completedUnits: totalUnits ? Math.min(completedUnits, totalUnits) : completedUnits,
      totalUnits,
      notes: typeof data.notes === 'string' ? data.notes.slice(0, 20000) : '',
      doneUnits: Array.isArray(data.doneUnits)
        ? [...new Set(data.doneUnits.filter((id): id is number => integer(id, -1, 1) !== -1 && id <= 1000))]
            .sort((a, b) => a - b)
            .slice(0, 1000)
        : [],
      quiz:
        data.quiz && typeof data.quiz === 'object' && !Array.isArray(data.quiz)
          ? Object.fromEntries(
              Object.entries(data.quiz as Record<string, unknown>)
                .filter(([id, value]) => /^\d{1,4}$/.test(id) && typeof value === 'boolean')
                .slice(0, 1000),
            ) as Record<string, boolean>
          : {},
    }
  }
  return result
}

export function loadEnglishStudy(email: string): EnglishStudyRecord {
  const raw = localStorage.getItem(storageKey(email))
  if (!raw) return emptyEnglishStudy()
  try {
    return normalizeRecord(JSON.parse(raw))
  } catch {
    throw new Error(
      'Ghi chú đã lưu không đọc được. Bạn vẫn có thể mở sách; dữ liệu cũ chưa bị ghi đè.',
    )
  }
}

export function validateEnglishStudy(entry: EnglishStudyEntry): string | undefined {
  if (integer(entry.page, -1, 1) === -1) return 'Trang đọc phải là số nguyên từ 1 đến 100.000.'
  if (integer(entry.completedUnits, -1) === -1 || integer(entry.totalUnits, -1) === -1)
    return 'Số bài phải là số nguyên từ 0 đến 100.000.'
  if (entry.totalUnits > 0 && entry.completedUnits > entry.totalUnits)
    return 'Số bài đã học không được lớn hơn tổng số bài.'
  if (
    typeof entry.notes !== 'string' ||
    entry.notes.length > 20000 ||
    typeof entry.currentUnit !== 'string' ||
    entry.currentUnit.length > 200
  )
    return 'Ghi chú tối đa 20.000 ký tự; tên bài tối đa 200 ký tự.'
}

export function saveEnglishStudy(email: string, state: EnglishStudyRecord) {
  for (const book of englishBooks) {
    const error = validateEnglishStudy(state[book.id])
    if (error) throw new Error(error)
  }
  localStorage.setItem(storageKey(email), JSON.stringify(normalizeRecord(state)))
}

export async function checkLocalPdf(file: File) {
  const signature = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Không đọc được file. Hãy chọn lại PDF trên máy.'))
    reader.readAsText(file.slice(0, 5))
  })
  if (signature !== '%PDF-')
    throw new Error('File này không phải PDF hợp lệ. Hãy chọn file sách định dạng .pdf.')
}

export function createLocalAudio(files: File[]): LocalStudyMedia[] {
  if (
    files.some(
      (file) =>
        !file.type.startsWith('audio/') &&
        !/\.(mp3|wav|ogg|m4a|aac|flac|webm|opus)$/i.test(file.name),
    )
  )
    throw new Error('Hãy chọn file audio: MP3, WAV, OGG, M4A, AAC, FLAC hoặc WebM.')
  const tracks: LocalStudyMedia[] = []
  try {
    for (const file of [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    ))
      tracks.push({ name: file.name, url: URL.createObjectURL(file), blob: file })
    return tracks
  } catch (error) {
    tracks.forEach((track) => URL.revokeObjectURL(track.url))
    throw error
  }
}

/** Sync bookkeeping kept next to the local copy: the server revision it is based on and unsent edits. */
export interface EnglishSyncMeta {
  version: number
  pending: boolean
}
export function loadSyncMeta(email: string): EnglishSyncMeta {
  try {
    const raw = JSON.parse(localStorage.getItem(`${storageKey(email)}:sync`) || 'null') as Partial<EnglishSyncMeta> | null
    return {
      version: typeof raw?.version === 'number' && Number.isInteger(raw.version) && raw.version >= 0 ? raw.version : 0,
      pending: raw?.pending === true,
    }
  } catch {
    return { version: 0, pending: false }
  }
}
export function saveSyncMeta(email: string, meta: EnglishSyncMeta) {
  try {
    localStorage.setItem(`${storageKey(email)}:sync`, JSON.stringify(meta))
  } catch {
    /* the notebook itself is what matters; sync simply retries */
  }
}

const OTHER_DEVICE = '\n\n——— Ghi chú từ thiết bị khác ———\n'

/**
 * Combines two edited copies of the notebook (this device and another one) without losing either: notes that
 * differ are kept one after the other, finished units are united, and this device's reading position wins.
 */
export function mergeStudy(local: EnglishStudyRecord, remote: EnglishStudyRecord): EnglishStudyRecord {
  const merged = emptyEnglishStudy()
  for (const book of englishBooks) {
    const mine = local[book.id]
    const theirs = remote[book.id]
    let notes = mine.notes
    if (theirs.notes && theirs.notes !== mine.notes) {
      if (theirs.notes.includes(mine.notes)) notes = theirs.notes
      else if (!mine.notes.includes(theirs.notes)) notes = `${mine.notes}${OTHER_DEVICE}${theirs.notes}`.slice(0, 20000)
    }
    const doneUnits = [...new Set([...mine.doneUnits, ...theirs.doneUnits])].sort((a, b) => a - b)
    const totalUnits = Math.max(mine.totalUnits, theirs.totalUnits)
    merged[book.id] = {
      page: mine.page,
      currentUnit: mine.currentUnit || theirs.currentUnit,
      totalUnits,
      completedUnits: Math.min(
        Math.max(mine.completedUnits, theirs.completedUnits, doneUnits.length),
        totalUnits || Number.MAX_SAFE_INTEGER,
      ),
      notes,
      doneUnits,
      quiz: { ...theirs.quiz, ...mine.quiz },
    }
  }
  return merged
}

/** True when the learner has entered nothing worth uploading (a fresh device). The unit total is filled in by the
 * built-in course and does not count. */
export function isEmptyStudy(record: EnglishStudyRecord) {
  return englishBooks.every(({ id }) => {
    const entry = record[id]
    return entry.page === 1 && !entry.currentUnit && !entry.completedUnits && !entry.notes &&
      !entry.doneUnits.length && !Object.keys(entry.quiz).length
  })
}
