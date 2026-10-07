import { gatewayUrl } from '@/api/authApi'

export interface MyCourse {
  courseId: number
  courseName: string
  packageName: string
  progress: number
  startedAt: string | null
  lastBookId: number | null
  lastLessonId: number | null
  lastStudiedAt: string | null
  enrolledAt: string
  expiredAt: string
}

export interface LessonResult {
  lessonId: number
  lessonName: string
  score: number
  submittedAt: string
  totalQuestion: number
  wrongCount: number
}

export interface StudyCard {
  id: number
  sourceKey: string
  kind: 'EXAMPLE' | 'GRAMMAR' | 'VOCAB'
  courseId: number | null
  bookId: number | null
  lessonId: number | null
  grammarId: number | null
  exampleId: number | null
  front: string
  back: string | null
  note: string | null
  dueAt: string
  repetitions: number
  createdAt: string
}

export type CardInput = Pick<StudyCard, 'sourceKey' | 'kind' | 'courseId' | 'bookId' | 'lessonId' | 'grammarId' | 'exampleId' | 'front' | 'back' | 'note'>
export interface WrongAnswer { id: number; lessonId: number; exerciseId: number; chosenAnswer: string | null; correctAnswer: string; updatedAt: string }

const base = '/api/nihongo-user/study'
export const getMyCourses = async () => (await gatewayUrl.get<MyCourse[]>('/api/nihongo-user/my-courses-dto')).data
export const getResults = async () => (await gatewayUrl.get<LessonResult[]>('/api/nihongo-user/userExerciseAttempt')).data
export const getCards = async (lessonId?: number) => (await gatewayUrl.get<StudyCard[]>(`${base}/cards`, { params: lessonId ? { lessonId } : {} })).data
export const getOverview = async () => (await gatewayUrl.get<{ dueCards: number; weakLessons: number }>(`${base}/overview`)).data
export const getDueCards = async () => (await gatewayUrl.get<StudyCard[]>(`${base}/cards/due`)).data
export const saveCard = async (input: CardInput) => (await gatewayUrl.put<StudyCard>(`${base}/cards`, input)).data
export const deleteCard = async (id: number) => gatewayUrl.delete(`${base}/cards/${id}`)
export const reviewCard = async (id: number, remembered: boolean) => (await gatewayUrl.post<StudyCard>(`${base}/cards/${id}/review`, null, { params: { remembered } })).data
export const getWrongAnswers = async (lessonId?: number) => (await gatewayUrl.get<WrongAnswer[]>(`${base}/wrong-answers`, { params: lessonId ? { lessonId } : {} })).data

export function latestResults(results: LessonResult[]) {
  const latest = new Map<number, LessonResult>()
  for (const result of [...results].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))) {
    if (!latest.has(result.lessonId)) latest.set(result.lessonId, result)
  }
  return [...latest.values()]
}
