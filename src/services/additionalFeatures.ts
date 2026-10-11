import { gatewayUrl } from '@/api/authApi'
export interface Page<T> { content: T[]; number: number; totalPages: number; totalElements: number }
export interface Profile { firstName: string; lastName: string; email: string; phone: string | null; address: string | null; birthday: string | null }
export interface Classroom { id: number; owner: string; name: string; description: string; courseId: number | null; archived: boolean; version: number }
export interface Assignment { id: number; classroomId: number; title: string; kind: 'EXAM' | 'HOMEWORK'; minutes: number; startsAt: string; dueAt: string; published: boolean; version: number }
export interface Question { id: number; content: string; answerA: string; answerB: string; answerC: string; answerD: string; chosen: string | null; correctAnswer: string | null }
export interface Attempt { id: number; assignmentId: number; title: string; version: number; serverNow: number; endsAt: number; finished: boolean; correct: number; total: number; score: number; questions: Question[]; answersVisible: boolean }
export interface Feedback { id: number; questionId: number | null; actor: string; text: string; createdAt: string }
export interface Refund { id: number; purchaseId: number; userId: string; amount: number; reason: string; status: string; revokeAccess: boolean; requestedBy: string; reviewNote: string | null; version: number }
export interface Job { id: string; userId?: string; depositId?: number; attempts: number; nextAttempt: string | number; expiresAt?: number; leased: boolean }
export const readFeature = async <T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal) => (await gatewayUrl.get<T>(path, { params, signal })).data
export const writeFeature = async <T>(path: string, body?: unknown) => (await gatewayUrl.post<T>(path, body)).data
export function featureError(error: unknown) { return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Chưa thực hiện được. Hãy thử lại.' }
export async function downloadCsv(path: string, name: string, params?: Record<string, unknown>) {
 const response = await gatewayUrl.get<Blob>(path, { params, responseType: 'blob' })
 const url = URL.createObjectURL(response.data), anchor = document.createElement('a')
 anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
