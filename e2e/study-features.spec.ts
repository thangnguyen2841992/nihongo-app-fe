import { test, expect } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined, viewport: { width: 1440, height: 1000 } })
const card = { id: 1, sourceKey: 'vocab:1', kind: 'VOCAB', front: '日本', back: 'Nhật Bản', note: null, repetitions: 0, dueAt: '2026-10-10T08:00:00', createdAt: '2026-10-10T07:00:00' }

test('dashboard, daily goals, reminders and mobile layout', async ({ page }) => {
  let goal = { dailyCards: 10, dailyAttempts: 1, remindersEnabled: true }
  await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS' }
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    let json: unknown = []
    if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Học viên', email: 'study@example.com', role: 'USER', sessionId: 'study-test' }
    if (path === '/api/nihongo-user/wallets') json = { walletId: 1, userId: 'study-test', balance: 100000 }
    if (path === '/api/nihongo-user/my-courses-dto') json = [{ courseId: 1, courseName: 'TRY! N3', packageName: '3 tháng', progress: 40, startedAt: '2026-10-01T08:00:00', enrolledAt: '2026-10-01T08:00:00', expiredAt: '2099-10-15T08:00:00' }]
    if (path === '/api/nihongo-user/study/goal') { goal = route.request().postDataJSON(); json = goal }
    if (path === '/api/nihongo-user/study/dashboard') json = { dueCards: 12, weakLessons: 2, attempts: 24, lessons: 8, averageScore: 82,
      cardsToday: 5, attemptsToday: 1, practiceToday: 3, goalCompleted: goal.dailyCards <= 5, streak: 6, longestStreak: 12, today: '2026-10-10', timeZone: 'Asia/Ho_Chi_Minh', goal,
      trend: [{ day: '2026-10-07', attempts: 2, averageScore: 65 }, { day: '2026-10-08', attempts: 3, averageScore: 75 }, { day: '2026-10-10', attempts: 1, averageScore: 90 }],
      reminders: goal.remindersEnabled ? [{ key: 'due-cards', message: 'Bạn có 12 thẻ đến hạn ôn tập', courseId: null, expiresAt: null }, { key: 'course:1', message: 'Khóa học sắp hết hạn trong 7 ngày tới', courseId: 1, expiresAt: '2026-10-15T08:00:00' }] : [] }
    await route.fulfill({ headers, json })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Chuỗi ngày học' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nhắc học', exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75')
  await page.screenshot({ path: '../tmp/study-dashboard-desktop.png', fullPage: true })
  await page.getByLabel('Thẻ mỗi ngày').fill('5')
  await page.getByLabel('Nhắc ôn và khóa sắp hết hạn trong ứng dụng').uncheck()
  await page.getByRole('button', { name: 'Lưu mục tiêu' }).click()
  await expect(page.getByText('Đã hoàn thành mục tiêu hôm nay!', { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nhắc học', exact: true })).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('complementary', { name: 'Menu học tập' })).toBeHidden()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '../tmp/study-dashboard-mobile.png', fullPage: true })
})

test('four ratings and practicing individual wrong answers', async ({ page }) => {
  let due = [card]
  let wrong = [{ id: 5, lessonId: 1, exerciseId: 10, chosenAnswer: 'A', correctAnswer: 'C', updatedAt: '2026-10-10T08:00:00' }]
  await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS' }
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    let json: unknown = []
    if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Học viên', email: 'study@example.com', role: 'USER', sessionId: 'study-test' }
    if (path === '/api/nihongo-user/wallets') json = { walletId: 1, userId: 'study-test', balance: 100000 }
    if (path.endsWith('/cards/due/batch')) json = due
    if (path.endsWith('/cards/1/rating')) { expect(route.request().postDataJSON().rating).toBe('EASY'); due = []; json = { ...card, dueAt: '2026-10-12T08:00:00' } }
    if (path.endsWith('/weak-lessons/page')) json = { content: [], number: 0, totalElements: 0, totalPages: 0 }
    if (path.endsWith('/wrong-answers/page')) json = { content: wrong, number: 0, totalElements: wrong.length, totalPages: wrong.length ? 1 : 0 }
    if (path === '/api/staff/getAllExcercisesKeywordOfLesson/1') json = [{ exerciseKeywordId: 10, contentNihongo: '日本は？', answerA: '東京', answerB: '大阪', answerC: 'Nhật Bản', answerD: '京都' }]
    if (path.endsWith('/wrong-answers/5/practice')) {
      const correct = route.request().postDataJSON().answer === 'C'
      if (correct) wrong = []
      json = { correct, correctAnswer: 'C' }
    }
    await route.fulfill({ headers, json })
  })
  await page.goto('/user/review')
  await page.getByRole('button', { name: 'Hiện đáp án' }).click()
  for (const label of ['Quên · 10 phút', 'Khó', 'Nhớ', 'Dễ']) await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Dễ', exact: true }).click()
  await expect(page.getByText('Bạn đã ôn hết thẻ đến hạn.', { exact: false })).toBeVisible()
  await page.getByRole('tab', { name: 'Câu sai (1)' }).click()
  await page.getByRole('button', { name: 'Luyện câu này' }).click()
  await expect(page.getByRole('heading', { name: '日本は？' })).toBeVisible()
  await page.getByRole('button', { name: 'A · 東京' }).click()
  await expect(page.getByText('Chưa đúng. Đáp án: C', { exact: false })).toBeVisible()
  await page.screenshot({ path: '../tmp/study-practice-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'C · Nhật Bản' }).click()
  await expect(page.getByText('Chưa có câu sai cần ôn.')).toBeVisible()
})
