import { test, expect, type Page } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined, viewport: { width: 1440, height: 1000 } })
const editor = '00000000-0000-0000-0000-000000000001'
const learner = '00000000-0000-0000-0000-000000000002'
const question = { id: 10, lessonId: 1, lessonName: 'Bài 1', bookId: 1, bookName: 'TRY! N3', levelId: 3, levelName: 'N3', typeId: 1, typeName: 'Ngữ pháp', difficulty: 'NORMAL', content: '日本は？', answerA: '東京', answerB: '大阪', answerC: 'Nhật Bản', answerD: '京都', correctAnswer: 'C' }
function paged<T>(content: T[]) { return { content, number: 0, totalElements: content.length, totalPages: content.length ? 1 : 0 } }
async function setup(page: Page, role: string) {
  const state = {
    catalog: [{ id: 1, name: 'Khóa N3', description: 'Ngữ pháp và luyện tập N3', levelId: 3, status: 'ACTIVE', version: 0, packages: [{ id: 2, name: 'Một tháng', durationDays: 30, price: 10000, active: true, version: 0 }] }],
    promotions: [{ id: 1, code: 'N3SALE', courseId: 1, percent: 10, maxUses: 5, used: 0, startsAt: '2026-10-01T00:00:00', endsAt: '2099-11-01T00:00:00', active: true, version: 0 }],
    bookStatus: 'IN_REVIEW', reviewNotes: [] as Array<{ id: number; bookId: number; actor: string; action: string; note: string; createdAt: string }>,
    issues: [{ id: 1, reporter: learner, lessonId: 1, exerciseId: 10 as number | null, category: 'ANSWER', detail: 'Đáp án câu này cần kiểm tra lại', status: 'OPEN', assignee: null as string | null, resolution: null as string | null, createdAt: '2026-10-10T08:00:00', updatedAt: '2026-10-10T08:00:00', version: 0 }],
    exams: [] as Array<{ id: number; title: string; owner: string; createdAt: string; questions: typeof question[] }>,
    notes: [] as Array<{ id: number; userId: string; actor: string; status: string; note: string; createdAt: string }>,
    revisionCurrent: '{"bookName":"Tên sách đã sửa"}', revisionToken: 'current-token',
    bought: false, balance: 50000,
  }
  await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url()), path = url.pathname, method = route.request().method()
    const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type,Idempotency-Key', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS' }
    if (method === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    let json: unknown = []
    if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: role === 'USER' ? 'Học viên' : 'Biên tập viên', email: 'test@example.com', role, sessionId: 'ops-test' }
    else if (path === '/api/nihongo-user/wallets') json = { walletId: 1, userId: learner, balance: state.balance }
    else if (path === '/api/staff/levels') json = [{ levelId: 3, levelName: 'N3' }]
    else if (path === '/api/staff/types') json = [{ typeId: 1, typeName: 'TRY' }]
    else if (path === '/api/staff/exerciseTypes') json = [{ exerciseTypeId: 1, name: 'Ngữ pháp' }]
    else if (path === '/api/users/staff-directory') json = [{ userId: editor, name: 'Biên tập viên A', role: 'STAFF' }]
    else if (path === '/api/users/staff/learners') json = [{ userId: learner, name: 'Học viên A', email: 'learner@example.com' }]
    else if (path === '/api/staff/books') json = [{ bookId: 1, bookName: 'TRY! N3', publicationStatus: state.bookStatus, imageUrls: [] }]
    else if (path === '/api/nihongo-user/admin/commerce/catalog') json = state.catalog
    else if (path === '/api/nihongo-user/admin/commerce/courses/1/packages/2') { const input = route.request().postDataJSON(); expect(input.version).toBe(0); state.catalog[0]!.packages[0] = { ...state.catalog[0]!.packages[0]!, ...input, version: 1 }; json = state.catalog[0] }
    else if (path === '/api/nihongo-user/admin/commerce/promotions') {
      if (method === 'POST') { const input = route.request().postDataJSON(); state.promotions.push({ ...input, id: 2, used: 0, version: 0 }); json = state.promotions[1] } else json = paged(state.promotions)
    }
    else if (path === '/api/nihongo-user/admin/commerce/revenue') json = { from: '2026-10-01', to: '2026-10-10', sales: 9000, renewals: 10000, walletDeposits: 50000, byCourse: [{ courseId: 1, courseName: 'Khóa N3', renewal: false, purchases: 1, amount: 9000 }, { courseId: 1, courseName: 'Khóa N3', renewal: true, purchases: 1, amount: 10000 }] }
    else if (path.endsWith('/admin/commerce/audit')) json = paged([{ id: 1, actor: editor, action: 'PACKAGE_UPDATE', target: 'package:2', detail: '10000 → 20000', createdAt: '2026-10-10T08:00:00' }])
    else if (path === '/api/staff/content/reviews') json = paged(url.searchParams.get('status') === state.bookStatus ? [{ bookId: 1, name: 'TRY! N3', status: state.bookStatus, assignee: null }] : [])
    else if (path === '/api/staff/content/reviews/1/history') json = paged(state.reviewNotes)
    else if (path === '/api/staff/content/reviews/1') { const input = route.request().postDataJSON(); expect(input.expectedStatus).toBe(state.bookStatus); if (input.action === 'REQUEST_CHANGES') state.bookStatus = 'DRAFT'; state.reviewNotes.push({ id: 1, bookId: 1, actor: editor, action: 'REVIEW_FEEDBACK', note: input.note, createdAt: '2026-10-10T08:00:00' }); json = { bookId: 1, status: state.bookStatus, errors: [], warnings: [] } }
    else if (path === '/api/staff/content/issues') json = paged(state.issues.filter(i => !url.searchParams.get('status') || i.status === url.searchParams.get('status')))
    else if (path === '/api/staff/content/issues/1') { const input = route.request().postDataJSON(); expect(input.version).toBe(0); state.issues[0] = { ...state.issues[0]!, ...input, version: 1 }; json = state.issues[0] }
    else if (path === '/api/staff/content/questions') json = paged([question])
    else if (path === '/api/staff/content/exams') { if (method === 'POST') { const input = route.request().postDataJSON(); expect(input.questionIds).toEqual([10]); const e = { id: 1, title: input.title, owner: editor, createdAt: '2026-10-10T08:00:00', questions: [{ ...question }] }; state.exams.push(e); json = e } else json = paged(state.exams.map(e => ({ ...e, questions: e.questions.length }))) }
    else if (path === '/api/staff/content/exams/1') json = state.exams[0]
    else if (path === '/api/staff/content/revisions/BOOK/1') json = { current: state.revisionCurrent, token: state.revisionToken, revisions: paged([{ id: 1, kind: 'BOOK', resourceId: 1, bookId: 1, actor: editor, action: 'EDIT', snapshot: '{"bookName":"Tên sách gốc"}', createdAt: '2026-10-09T08:00:00' }]) }
    else if (path === '/api/staff/content/revisions/BOOK/1/restore') { expect(route.request().postDataJSON()).toEqual({ revisionId: 1, token: 'current-token' }); state.revisionCurrent = '{"bookName":"Tên sách gốc"}'; state.revisionToken = 'new-token'; json = {} }
    else if (path.endsWith('/staff/analytics/lessons')) json = paged([{ lessonId: 1, attempts: 8, learners: 3, averageScore: 65 }])
    else if (path.endsWith('/staff/analytics/inactive')) json = paged([{ userId: learner, lastStudiedAt: null, courses: 1 }])
    else if (path.endsWith('/staff/analytics/declining')) json = paged([{ userId: learner, recentScore: 45, previousScore: 85, lastAttempt: '2026-10-10T08:00:00' }])
    else if (path.endsWith('/staff/analytics/questions')) json = paged([{ lessonId: 1, exerciseId: 10, learners: 2, lastWrong: '2026-10-10T08:00:00' }])
    else if (path.endsWith('/notes')) { if (method === 'POST') { const input = route.request().postDataJSON(); const n = { id: 1, userId: learner, actor: editor, ...input, createdAt: '2026-10-10T08:00:00' }; state.notes.push(n); json = n } else json = paged(state.notes) }
    else if (path === '/api/nihongo-user/courses') json = [{ courseId: 1, courseName: 'Khóa N3', courseDescription: 'Học N3', active: 'Đang hoạt động', packages: [{ packageId: 2, packageName: 'Một tháng', durationDays: 30, price: 10000 }] }]
    else if (path === '/api/nihongo-user/promotions/quote') { expect(url.searchParams.get('code')).toBe('N3SALE'); json = { code: 'N3SALE', originalPrice: 10000, discount: 1000, payable: 9000 } }
    else if (path === '/api/nihongo-user/subscriptions') { expect(url.searchParams.get('couponCode')).toBe('N3SALE'); expect(url.searchParams.get('expectedAmount')).toBe('9000'); expect(route.request().headers()['idempotency-key']).toBeTruthy(); state.bought = true; state.balance -= 9000; json = { id: 1 } }
    else if (path === '/api/nihongo-user/my-courses') json = state.bought ? [1] : []
    else if (path === '/api/nihongo-user/my-courses-dto') json = state.bought ? [{ courseId: 1, expiredAt: '2099-11-01T00:00:00', progress: 0, startedAt: null, lastBookId: null, lastLessonId: null }] : []
    else if (path === '/api/staff/content/reports') { const input = route.request().postDataJSON(); state.issues.push({ ...state.issues[0]!, ...input, id: 2, reporter: learner, status: 'OPEN', version: 0 }); json = state.issues[1] }
    else if (path === '/api/staff/content/reports/mine') json = paged(state.issues)
    await route.fulfill({ headers, json })
  })
  return state
}

test('admin manages prices, promotions, review feedback, audit and separated revenue', async ({ page }) => {
  await setup(page, 'ADMIN')
  await page.goto('/admin/catalog')
  await page.getByRole('button', { name: 'Sửa gói', exact: true }).click()
  await page.getByLabel('Giá (VND)').fill('20000')
  await page.getByRole('button', { name: 'Lưu gói học' }).click()
  await expect(page.getByText('Đã lưu gói học.', { exact: false })).toBeVisible()
  await expect(page.getByRole('cell', { name: /20.000/ })).toBeVisible()
  await page.goto('/admin/promotions')
  await page.getByRole('button', { name: 'Tạo mã giảm giá' }).click()
  await page.getByLabel('Mã giảm giá', { exact: true }).fill('WELCOME20')
  await page.getByLabel('Giảm (%)').fill('20')
  await page.getByRole('button', { name: 'Lưu mã giảm giá' }).click()
  await expect(page.getByRole('cell', { name: 'WELCOME20', exact: true })).toBeVisible()
  await page.goto('/admin/reviews')
  await page.getByRole('button', { name: 'Phản hồi & lịch sử duyệt' }).click()
  await page.getByLabel('Ghi chú duyệt / yêu cầu sửa').fill('Bổ sung giải thích đáp án ở bài 1 trước khi xuất bản')
  await page.getByRole('button', { name: 'Trả bài yêu cầu sửa' }).click()
  await expect(page.getByText('Đã lưu quyết định duyệt và phản hồi.')).toBeVisible()
  await page.goto('/admin/audit')
  await expect(page.getByRole('cell', { name: 'Sửa giá / gói' })).toBeVisible()
  await page.goto('/admin/revenue')
  await expect(page.getByRole('heading', { name: 'Doanh số trước hoàn tiền' }).locator('..')).toContainText('19.000')
  await expect(page.getByRole('heading', { name: 'Nạp ví đã duyệt' }).locator('..')).toContainText('50.000')
  await page.screenshot({ path: '../tmp/ops-admin-revenue-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => { const nav = document.querySelector('nav.navbar')?.getBoundingClientRect(), menu = document.querySelector('aside.sidebar')?.getBoundingClientRect(); return Boolean(nav && menu && menu.top >= nav.bottom - 1) })).toBe(true)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '../tmp/ops-admin-revenue-mobile.png', fullPage: true })
})

test('staff resolves reports, creates an exam, restores content and follows up learners', async ({ page }) => {
  await setup(page, 'STAFF')
  await page.goto('/staff/editorial')
  await page.getByRole('button', { name: 'Xử lý', exact: true }).click()
  await page.getByRole('combobox', { name: 'Trạng thái', exact: true }).last().selectOption('RESOLVED')
  await page.getByLabel('Phản hồi / cách xử lý').fill('Đã kiểm tra và sửa lại giải thích đáp án')
  await page.getByRole('button', { name: 'Lưu xử lý' }).click()
  await expect(page.getByText('Đã cập nhật báo lỗi.')).toBeVisible()
  await page.goto('/staff/question-bank')
  await page.getByLabel('Chọn câu 10').check()
  await page.getByLabel('Tên đề').fill('Luyện ngữ pháp N3 tuần 1')
  await page.getByRole('button', { name: 'Tạo đề từ câu đã chọn' }).click()
  await expect(page.locator('.ops-print')).toContainText('Luyện ngữ pháp N3 tuần 1')
  await expect(page.locator('.ops-print')).not.toContainText('Đáp án: C')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải đề dạng văn bản' }).click()
  expect((await download).suggestedFilename()).toBe('de-luyen-1.txt')
  await page.evaluate(() => window.scrollTo(0,0))
  await page.screenshot({ path: '../tmp/ops-staff-question-bank.png', fullPage: true })
  await page.goto('/staff/revisions?kind=BOOK&id=1')
  await page.getByRole('button', { name: 'So sánh phiên bản' }).click()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Khôi phục bản này' }).click()
  await expect(page.getByText('Đã khôi phục nội dung.', { exact: false })).toBeVisible()
  await page.goto('/staff/insights')
  await page.getByRole('tab', { name: 'Ít hoạt động' }).click()
  await expect(page.getByRole('cell', { name: /Học viên A/ })).toBeVisible()
  await page.getByRole('button', { name: 'Ghi chú hỗ trợ' }).click()
  await page.getByLabel('Ghi chú', { exact: true }).fill('Cần hỗ trợ ôn phần nghe và lập lịch học')
  await page.getByRole('button', { name: 'Lưu ghi chú' }).click()
  await expect(page.getByText('Đã lưu ghi chú hỗ trợ.')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0,0))
  await expect.poll(() => page.evaluate(() => { const nav = document.querySelector('nav.navbar')?.getBoundingClientRect(), heading = document.querySelector('.ops-heading')?.getBoundingClientRect(); return Boolean(nav && heading && heading.top >= nav.bottom - 1) })).toBe(true)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '../tmp/ops-staff-insights-mobile.png', fullPage: true })
})

test('learner pays the discounted displayed amount and follows reported issues', async ({ page }) => {
  const state = await setup(page, 'USER')
  await page.goto('/courses')
  await page.getByRole('button', { name: /Mua khóa học/ }).click()
  await page.getByLabel('Mã giảm giá (nếu có)').fill('N3SALE')
  await page.getByRole('button', { name: 'Kiểm tra mã' }).click()
  await expect(page.locator('.modal-box .pkg-price')).toContainText('9.000')
  await page.getByRole('button', { name: 'Thanh toán từ ví' }).click()
  await expect(page.locator('.modal-box')).toHaveCount(0)
  expect(state.balance).toBe(41000)
  await page.goto('/user/content-reports')
  await expect(page.getByRole('heading', { name: 'Báo lỗi của tôi' })).toBeVisible()
  await expect(page.getByText('Đáp án câu này cần kiểm tra lại')).toBeVisible()
})
