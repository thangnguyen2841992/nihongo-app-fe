import { gatewayUrl } from '@/api/authApi'
export interface OpsPage<T> { content: T[]; totalElements: number; number: number; totalPages: number }
export interface Member { userId: string; name: string; role: string }
export interface Issue { id: number; reporter: string; lessonId: number; exerciseId: number | null; category: string; detail: string; status: string; assignee: string | null; resolution: string | null; createdAt: string; updatedAt: string; version: number }
export interface ReviewBook { bookId: number; name: string; status: string; assignee: string | null }
export interface ReviewEntry { id: number; bookId: number; actor: string; action: string; note: string | null; assignee: string | null; createdAt: string }
export interface Question { id: number; lessonId: number; lessonName: string; bookId: number; bookName: string; levelId: number; levelName: string; typeId: number; typeName: string; difficulty: string; content: string; answerA: string; answerB: string; answerC: string; answerD: string; correctAnswer: string }
export interface Exam { id: number; title: string; owner: string; createdAt: string; questions: Question[] }
export interface ExamSummary { id: number; title: string; owner: string; createdAt: string; questions: number }
export interface Revision { id: number; kind: string; resourceId: number; bookId: number; actor: string; action: string; snapshot: string; createdAt: string }
export interface RevisionHistory { current: string; token: string; revisions: OpsPage<Revision> }
export interface Pack { id: number; name: string; durationDays: number; price: number; active: boolean; version: number }
export interface Catalog { id: number; name: string; description: string | null; levelId: number; status: string; version: number; packages: Pack[] }
export interface Promotion { id: number; code: string; courseId: number | null; percent: number; maxUses: number; used: number; startsAt: string; endsAt: string; active: boolean; version: number }
export interface Revenue { from: string; to: string; sales: number; renewals: number; walletDeposits: number; refunds?: number; byCourse: Array<{ courseId: number; courseName: string; renewal: boolean; purchases: number; amount: number }> }
export interface Audit { id: number; actor: string; action: string; target: string; detail: string; createdAt: string }
export const contentBase = '/api/staff/content'
export const commerceBase = '/api/nihongo-user/admin/commerce'
export const getOps = async <T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal) => (await gatewayUrl.get<T>(path, { params, signal })).data
export const sendOps = async <T = unknown>(method: 'post' | 'put', path: string, body: unknown) => (await gatewayUrl[method]<T>(path, body)).data
export function opsError(error: unknown, fallback = 'Không thực hiện được. Hãy thử lại.') { return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback }
const moneyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
export function money(value: number) { return moneyFormatter.format(value) }
export function dateTime(value: string | null) { return value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có' }
export function plain(html: string) { const el = document.createElement('template'); el.innerHTML = html || ''; el.content.querySelectorAll('rt,rp').forEach(n => n.remove()); return el.content.textContent?.replace(/\s+/g, ' ').trim() || '' }
export const issueLabels: Record<string, string> = { OPEN: 'Mới', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã sửa', DISMISSED: 'Đã đóng' }
export const categoryLabels: Record<string, string> = { ANSWER: 'Đáp án', GRAMMAR: 'Ngữ pháp', AUDIO: 'Âm thanh', OTHER: 'Khác' }
export const publicationLabels: Record<string, string> = { DRAFT: 'Bản nháp', IN_REVIEW: 'Chờ duyệt', PUBLISHED: 'Đã xuất bản' }
export const reviewActionLabels: Record<string, string> = { SUBMIT: 'Gửi duyệt', PUBLISH: 'Xuất bản', RETURN_DRAFT: 'Chuyển về bản nháp', REQUEST_CHANGES: 'Yêu cầu sửa', ASSIGN: 'Phân công', REVIEW_FEEDBACK: 'Phản hồi duyệt' }
export const difficultyLabels: Record<string, string> = { EASY: 'Dễ', NORMAL: 'Vừa', HARD: 'Khó' }
