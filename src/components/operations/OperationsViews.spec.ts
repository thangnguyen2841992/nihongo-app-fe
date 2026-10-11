import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { getOps, sendOps, contentBase, commerceBase, type RevisionHistory } from '@/services/operationsApi'
import RevenueReport from './RevenueReport.vue'
import CatalogManagement from './CatalogManagement.vue'
import EditorialWorkspace from './EditorialWorkspace.vue'
import ContentRevisions from './ContentRevisions.vue'
import QuestionBank from './QuestionBank.vue'
import LearnerNotes from './LearnerNotes.vue'
import AdminAuditLog from './AdminAuditLog.vue'

const auth = vi.hoisted(() => ({ role: 'STAFF' }))
vi.mock('@/services/authState', async () => { const { ref } = await import('vue'); return { useAuthState: () => ({ userRole: ref(auth.role) }) } })
vi.mock('@/services/operationsApi', async importOriginal => ({ ...await importOriginal<typeof import('@/services/operationsApi')>(), getOps: vi.fn(), sendOps: vi.fn() }))
const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
const global = { plugins: [router], stubs: { RouterLink: { template: '<a><slot /></a>' } } }
let wrapper: ReturnType<typeof mount> | undefined
const empty = { content: [], number: 0, totalElements: 0, totalPages: 0 }
const course = { id: 1, name: 'N3', description: 'Học N3', levelId: 3, status: 'ACTIVE', version: 2, packages: [{ id: 2, name: 'Tháng', durationDays: 30, price: 10000, active: true, version: 5 }] }
beforeEach(async () => { vi.resetAllMocks(); auth.role = 'STAFF'; await router.push('/'); vi.mocked(getOps).mockResolvedValue(empty) })
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.restoreAllMocks() })

it('separates revenue from approved wallet deposits', async () => {
  vi.mocked(getOps).mockResolvedValue({ from: '2026-10-01', to: '2026-10-10', sales: 9000, renewals: 10000, walletDeposits: 50000, byCourse: [] })
  wrapper = mount(RevenueReport, { global }); await flushPromises()
  const values = wrapper.findAll('.ops-number').map(n => n.text())
  expect(values[2]).toContain('19.000'); expect(wrapper.findAll('article').find(panel => panel.text().includes('Nạp ví đã duyệt'))!.find('.ops-number').text()).toContain('50.000')
  expect(wrapper.text()).toContain('không cộng vào doanh thu bán khóa')
})

it('sends package version and retains the edit form on a stale price conflict', async () => {
  vi.mocked(getOps).mockImplementation(async <T>(path: string): Promise<T> => (path.endsWith('/catalog') ? [course] : [{ levelId: 3, levelName: 'N3' }]) as T)
  vi.mocked(sendOps).mockRejectedValue({ response: { data: { message: 'Gói đã thay đổi; hãy tải lại' } } })
  wrapper = mount(CatalogManagement, { global }); await flushPromises()
  await wrapper.findAll('button').find(b => b.text() === 'Sửa gói')!.trigger('click')
  await wrapper.get('input[type="number"][step="1"]').setValue(20000)
  await wrapper.findAll('form').find(f => f.text().includes('Giá (VND)'))!.trigger('submit'); await flushPromises()
  expect(sendOps).toHaveBeenCalledWith('put', commerceBase + '/courses/1/packages/2', expect.objectContaining({ price: 20000, version: 5 }))
  expect(wrapper.get('[role="alert"]').text()).toContain('Gói đã thay đổi')
  expect(wrapper.find('input[type="number"][step="1"]').exists()).toBe(true)
})

it('staff can inspect review history but publication actions are absent', async () => {
  vi.mocked(getOps).mockImplementation(async <T>(path: string): Promise<T> => (path.endsWith('/staff-directory') ? [] : path.endsWith('/reviews') ? { ...empty, content: [{ bookId: 1, name: 'TRY N3', status: 'IN_REVIEW', assignee: null }], totalElements: 1, totalPages: 1 } : empty) as T)
  wrapper = mount(EditorialWorkspace, { props: { initialTab: 'reviews' }, global }); await flushPromises()
  await wrapper.findAll('button').find(b => b.text() === 'Phản hồi & lịch sử duyệt')!.trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('TRY N3')
  expect(wrapper.text()).not.toContain('Duyệt xuất bản')
  expect(wrapper.text()).not.toContain('Trả bài yêu cầu sửa')
})

it('admin returns a reviewed book with its reason and expected state', async () => {
  auth.role = 'ADMIN'
  vi.mocked(getOps).mockImplementation(async <T>(path: string): Promise<T> => (path.endsWith('/staff-directory') ? [] : path.endsWith('/reviews') ? { ...empty, content: [{ bookId: 1, name: 'TRY N3', status: 'IN_REVIEW', assignee: null }], totalElements: 1, totalPages: 1 } : empty) as T)
  vi.mocked(sendOps).mockResolvedValue({})
  wrapper = mount(EditorialWorkspace, { props: { initialTab: 'reviews' }, global }); await flushPromises()
  await wrapper.findAll('button').find(b => b.text() === 'Phản hồi & lịch sử duyệt')!.trigger('click'); await flushPromises()
  await wrapper.get('textarea').setValue('Bổ sung giải thích đáp án trước khi xuất bản')
  await wrapper.findAll('button').find(b => b.text() === 'Trả bài yêu cầu sửa')!.trigger('click'); await flushPromises()
  expect(sendOps).toHaveBeenCalledWith('post', contentBase + '/reviews/1', expect.objectContaining({ action: 'REQUEST_CHANGES', note: 'Bổ sung giải thích đáp án trước khi xuất bản', expectedStatus: 'IN_REVIEW' }))
})

it('restores only with the current content token and presents stale content errors', async () => {
  await router.push('/staff/revisions?kind=BOOK&id=1')
  const history: RevisionHistory = { current: '{"bookName":"Tên mới"}', token: 'current-hash', revisions: { ...empty, totalElements: 1, totalPages: 1, content: [{ id: 7, kind: 'BOOK', resourceId: 1, bookId: 1, actor: 'editor', action: 'EDIT', snapshot: '{"bookName":"Tên cũ"}', createdAt: '2026-10-10T08:00:00' }] } }
  vi.mocked(getOps).mockResolvedValue(history)
  vi.mocked(sendOps).mockRejectedValue({ response: { data: { message: 'Nội dung đã thay đổi; hãy tải lại' } } })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  wrapper = mount(ContentRevisions, { global }); await flushPromises()
  await wrapper.findAll('button').find(b => b.text() === 'So sánh phiên bản')!.trigger('click')
  await wrapper.findAll('button').find(b => b.text() === 'Khôi phục bản này')!.trigger('click'); await flushPromises()
  expect(sendOps).toHaveBeenCalledWith('post', contentBase + '/revisions/BOOK/1/restore', { revisionId: 7, token: 'current-hash' })
  expect(wrapper.get('[role="alert"]').text()).toContain('Nội dung đã thay đổi')
  expect(wrapper.text()).not.toContain('Đã khôi phục nội dung')
})

it('creates a saved exam from selected questions and keeps answer keys hidden in preview', async () => {
  const question = { id: 10, lessonId: 1, lessonName: 'Bài 1', bookId: 1, bookName: 'TRY N3', levelId: 3, levelName: 'N3', typeId: 1, typeName: 'Ngữ pháp', difficulty: 'NORMAL', content: '日本は？', answerA: 'A', answerB: 'B', answerC: 'C', answerD: 'D', correctAnswer: 'C' }
  vi.mocked(getOps).mockImplementation(async <T>(path: string): Promise<T> => (path.endsWith('/levels') || path.endsWith('/exerciseTypes') ? [] : path.endsWith('/questions') ? { ...empty, content: [question], totalElements: 1, totalPages: 1 } : empty) as T)
  vi.mocked(sendOps).mockResolvedValue({ id: 1, title: 'Đề N3', owner: 'editor', createdAt: '2026-10-10T08:00:00', questions: [question] })
  wrapper = mount(QuestionBank, { global }); await flushPromises()
  await wrapper.get('input[aria-label="Chọn câu 10"]').setValue(true)
  await wrapper.get('input[placeholder="Ví dụ: Luyện ngữ pháp N3 tuần 1"]').setValue('Đề N3')
  await wrapper.findAll('form').find(f => f.text().includes('Đã chọn'))!.trigger('submit'); await flushPromises()
  expect(sendOps).toHaveBeenCalledWith('post', contentBase + '/exams', { title: 'Đề N3', questionIds: [10] })
  expect(wrapper.get('.ops-print').text()).not.toContain('Đáp án: C')
})

it('saves a support note for the selected learner without sending an external message', async () => {
  vi.mocked(sendOps).mockResolvedValue({})
  wrapper = mount(LearnerNotes, { props: { userId: 'learner-1', name: 'Học viên A' }, global }); await flushPromises()
  await wrapper.get('textarea').setValue('Cần hỗ trợ ôn phần nghe')
  await wrapper.get('form').trigger('submit'); await flushPromises()
  expect(sendOps).toHaveBeenCalledWith('post', '/api/nihongo-user/staff/analytics/learners/learner-1/notes', { status: 'OPEN', note: 'Cần hỗ trợ ôn phần nghe' })
  expect(wrapper.text()).toContain('Đã lưu ghi chú hỗ trợ')
})

it('cancels obsolete audit requests and keeps the selected tab after late responses', async () => {
  let finishOld!: (value: unknown) => void
  vi.mocked(getOps).mockReturnValueOnce(new Promise(resolve => { finishOld = resolve }))
  vi.mocked(getOps).mockResolvedValueOnce({ ...empty, content: [{ id: 2, actor: 'Admin mới', action: 'ROLE_CHANGE', target: 'Account', detail: '', createdAt: '2026-10-10T08:00:00' }] })
  wrapper = mount(AdminAuditLog, { global })
  const firstSignal = vi.mocked(getOps).mock.calls[0]?.[2]
  await wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'Tài khoản & quyền')!.trigger('click')
  await flushPromises()
  expect(firstSignal?.aborted).toBe(true)
  finishOld({ ...empty, content: [{ id: 1, actor: 'Kết quả cũ', action: 'COURSE_CREATE', target: 'Course', detail: '', createdAt: '2026-10-10T08:00:00' }] })
  await flushPromises()
  expect(wrapper.text()).toContain('Admin mới')
  expect(wrapper.text()).not.toContain('Kết quả cũ')
  const activeSignal = vi.mocked(getOps).mock.calls[1]?.[2]
  wrapper.unmount(); wrapper = undefined
  expect(activeSignal?.aborted).toBe(true)
})

it('allows loading another content history while the previous request is still pending', async () => {
  await router.push('/staff/revisions?kind=BOOK&id=1')
  let rejectOld!: (error: unknown) => void
  vi.mocked(getOps).mockReturnValueOnce(new Promise((_, reject) => { rejectOld = reject }))
  wrapper = mount(ContentRevisions, { global })
  const signal = vi.mocked(getOps).mock.calls[0]?.[2]
  await wrapper.get('input[type="number"]').setValue(2)
  expect(signal?.aborted).toBe(true)
  expect(wrapper.get('form button').attributes('disabled')).toBeUndefined()
  vi.mocked(getOps).mockResolvedValueOnce({ current: '{"bookName":"Sách thứ hai"}', token: 'new', revisions: empty })
  await wrapper.get('form').trigger('submit'); await flushPromises()
  rejectOld(new Error('obsolete request failed')); await flushPromises()
  expect(wrapper.text()).toContain('Sách thứ hai')
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})

it('does not display an old book history failure after selecting another book', async () => {
  const books = [1, 2].map(bookId => ({ bookId, name: `Book ${bookId}`, status: 'IN_REVIEW', assignee: null }))
  vi.mocked(getOps).mockImplementation(async <T>(path: string): Promise<T> => (path.endsWith('/staff-directory') ? [] : path.endsWith('/reviews') ? { ...empty, content: books, totalElements: 2, totalPages: 1 } : empty) as T)
  wrapper = mount(EditorialWorkspace, { props: { initialTab: 'reviews' }, global }); await flushPromises()
  let rejectOld!: (error: unknown) => void
  vi.mocked(getOps).mockReturnValueOnce(new Promise((_, reject) => { rejectOld = reject }))
  const buttons = wrapper.findAll('button').filter(button => button.text() === 'Phản hồi & lịch sử duyệt')
  await buttons[0]!.trigger('click')
  const signal = vi.mocked(getOps).mock.lastCall?.[2]
  await buttons[1]!.trigger('click'); await flushPromises()
  expect(signal?.aborted).toBe(true)
  rejectOld(new Error('previous book failed')); await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})
