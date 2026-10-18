import { test, expect } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined })
for (const width of [1440, 390]) {
  test(`sidebar opens active courses and resumes the last lesson at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.routeWebSocket(/.*/, socket => socket.close())
    const date = (days: number) => new Date(Date.now() + days * 86400000).toISOString()
    const courses = [
      { courseId: 1, courseName: 'Tiếng Nhật N5 đang học', packageName: 'VIP', progress: 35, startedAt: date(-10), lastBookId: 11, lastLessonId: 101, lastStudiedAt: date(-1), enrolledAt: date(-15), expiredAt: date(20) },
      { courseId: 2, courseName: 'Khóa đã hết hạn', packageName: 'VIP', progress: 100, startedAt: date(-10), lastBookId: 12, lastLessonId: 102, lastStudiedAt: date(-2), enrolledAt: date(-15), expiredAt: date(-1) },
      { courseId: 3, courseName: 'Tiếng Nhật N4 mới đăng ký', packageName: 'VIP', progress: 0, startedAt: null as string | null, lastBookId: null, lastLessonId: null, lastStudiedAt: null, enrolledAt: date(-2), expiredAt: date(30) },
    ]
    let started = false
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const path = new URL(route.request().url()).pathname
      const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type,Cache-Control', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' }
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let json: unknown = []
      if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Course sidebar', email: 'courses@example.test', role: 'USER', sessionId: 'sidebar-courses' }
      if (path === '/api/nihongo-user/wallets') json = { walletId: 1, userId: 'learner', balance: 100000 }
      if (path === '/api/notification/broadcasts') json = { content: [], totalPages: 0 }
      if (path === '/api/nihongo-user/my-courses-dto') json = courses
      if (path === '/api/staff/books/11') json = { bookId: 11, bookName: 'Giáo trình N5' }
      if (path === '/api/staff/getLessonsByBook') json = [{ lessonId: 101, bookId: 11, name: 'Bài đang học', description: '', reading: '日本語を勉強しています。' }]
      if (path === '/api/nihongo-user/courses/3/learning-position' && route.request().method() === 'PUT') {
        started = true; courses[2]!.startedAt = date(0)
        expect(route.request().postDataJSON()).toEqual({ bookId: null, lessonId: null })
      }
      await route.fulfill({ headers, json })
    })
    await page.goto('/user/my-courses')
    const sidebar = page.locator('#user-sidebar')
    if (width <= 768) await page.getByRole('button', { name: 'Mở menu học tập', exact: true }).click()
    const quick = sidebar.getByLabel('Khóa học đang tham gia', { exact: true })
    await expect(quick.getByRole('link')).toHaveCount(2)
    await expect(quick).not.toContainText('Khóa đã hết hạn')
    await expect(sidebar.getByRole('link', { name: 'Khóa học của tôi', exact: true })).toBeVisible()
    await expect(quick.getByRole('link').first()).toContainText('Tiếng Nhật N5 đang học')
    await page.screenshot({ path: `../tmp/sidebar-courses-${width}.png` })
    await quick.getByRole('link', { name: 'Tiếng Nhật N5 đang học', exact: false }).click()
    await expect(page).toHaveURL(/\/course\/book\/11\?courseId=1&lessonId=101$/)
    if (width <= 768) { await expect(sidebar).toBeHidden(); await page.getByRole('button', { name: 'Mở menu học tập', exact: true }).click() }
    await expect(quick.getByRole('link', { name: 'Tiếng Nhật N5 đang học', exact: false })).toHaveAttribute('aria-current', 'page')
    await quick.getByRole('link', { name: 'Tiếng Nhật N4 mới đăng ký', exact: false }).click()
    await expect(page).toHaveURL(/\/course\/3\/books$/)
    expect(started).toBe(true)
    await expect(page.getByRole('heading', { name: 'Giáo trình của bạn', exact: true })).toBeVisible()
    if (width <= 768) await expect(sidebar).toBeHidden()
    else await expect(sidebar).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const resume of [false, true]) {
  test(`switching N3 → N4 → N5 → N3 updates ${resume ? 'lesson content' : 'book lists'} including rapid clicks`, async ({ page }) => {
    await page.routeWebSocket(/.*/, socket => socket.close())
    const expiry = new Date(Date.now() + 86400000).toISOString()
    const courses = [3, 4, 5].map(id => ({
      courseId: id, courseName: `Tiếng Nhật N${id}`, packageName: 'VIP', progress: 10,
      startedAt: expiry, enrolledAt: expiry, expiredAt: expiry,
      lastBookId: resume ? id * 10 : null, lastLessonId: resume ? id * 100 : null,
    }))
    let holdOldResponse = false
    let releaseOldResponse!: () => void, markOldRequested!: () => void, markOldFinished!: () => void
    const oldResponse = new Promise<void>(resolve => { releaseOldResponse = resolve })
    const oldRequested = new Promise<void>(resolve => { markOldRequested = resolve })
    const oldFinished = new Promise<void>(resolve => { markOldFinished = resolve })
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const url = new URL(route.request().url()), path = url.pathname
      const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type,Cache-Control', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' }
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let json: unknown = []
      if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Learner', email: 'courses@example.test', role: 'USER', sessionId: 'switch-courses' }
      if (path === '/api/nihongo-user/wallets') json = { walletId: 1, userId: 'learner', balance: 100000 }
      if (path === '/api/notification/broadcasts') json = { content: [], totalPages: 0 }
      if (path === '/api/nihongo-user/my-courses-dto') json = courses
      if (path.includes('/getBooksByLevel/')) {
        const id = Number(path.split('/').pop())
        json = [{ bookId: id * 10, bookName: `Giáo trình N${id}`, levelName: `N${id}`, typeName: 'Ngữ pháp', imageUrls: [] }]
      }
      if (/\/books\/\d+$/.test(path)) {
        const bookId = Number(path.split('/').pop())
        json = { bookId, bookName: `Giáo trình N${bookId / 10}` }
      }
      if (path === '/api/staff/getLessonsByBook') {
        const bookId = Number(url.searchParams.get('bookId'))
        json = [{ bookId, lessonId: bookId * 10, name: `Bài học N${bookId / 10}`, reading: `<p>Nội dung N${bookId / 10}</p>`, description: '' }]
      }
      const delayed = holdOldResponse && (resume
        ? path === '/api/staff/getLessonsByBook' && url.searchParams.get('bookId') === '40'
        : path === '/api/nihongo-user/getBooksByLevel/4')
      if (delayed) { markOldRequested(); await oldResponse }
      await route.fulfill({ headers, json })
      if (delayed) markOldFinished()
    })
    await page.goto('/user/my-courses')
    const quick = page.locator('#user-sidebar').getByLabel('Khóa học đang tham gia', { exact: true })
    const link = (id: number) => quick.getByRole('link', { name: `Tiếng Nhật N${id}`, exact: false })
    const assertContent = async (id: number) => {
      await expect(page.getByRole('heading', { name: `📚 Giáo trình N${id}`, exact: true }).or(page.locator('.book-info h2').filter({ hasText: `Giáo trình N${id}` }))).toBeVisible()
      if (resume) await expect(page.locator('.lesson-reading-content')).toHaveText(`Nội dung N${id}`)
      await expect(link(id)).toHaveAttribute('aria-current', id === 3 ? 'location' : 'page')
    }
    for (const id of [3, 4, 5, 3]) {
      await link(id).click()
      await assertContent(id)
    }
    // All selections in a single event loop, with the final choice returning to N3.
    await quick.evaluate(element => {
      const links = [...element.querySelectorAll<HTMLAnchorElement>('a')]
      for (const id of [4, 5, 3]) links.find(link => link.title === `Tiếng Nhật N${id}`)!.click()
    })
    await expect(page).toHaveURL(resume ? /\/course\/book\/30\?courseId=3&lessonId=300$/ : /\/course\/3\/books$/)
    await assertContent(3)
    // Returning to N3 must also survive N4 data arriving after the switch.
    holdOldResponse = true
    await link(4).click()
    await oldRequested
    await link(3).click()
    await assertContent(3)
    releaseOldResponse()
    await oldFinished
    await assertContent(3)
  })
}

for (const width of [1440, 390]) {
  test(`N3 sidebar switches between books, flashcards and conversation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.routeWebSocket(/.*/, socket => socket.close())
    const date = new Date(Date.now() + 86400000).toISOString()
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const path = new URL(route.request().url()).pathname
      const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type,Cache-Control', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' }
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let json: unknown = []
      if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Learner', email: 'n3@example.test', role: 'USER', sessionId: 'n3-sections' }
      if (path === '/api/nihongo-user/wallets') json = { balance: 100000 }
      if (path === '/api/notification/broadcasts') json = { content: [], totalPages: 0 }
      if (path === '/api/nihongo-user/my-courses-dto') json = [{ courseId: 42, courseName: 'Tiếng Nhật N3', packageName: 'VIP', progress: 20, startedAt: date, enrolledAt: date, expiredAt: date, lastBookId: 30, lastLessonId: 300 }]
      if (path === '/api/staff/books/30') json = { bookId: 30, bookName: 'Giáo trình N3' }
      if (path === '/api/staff/getLessonsByBook') json = [{ bookId: 30, lessonId: 300, name: 'Bài N3', reading: 'Nội dung N3' }]
      if (path === '/api/nihongo-user/getBooksByLevel/42') json = [{ bookId: 30, bookName: 'Giáo trình N3', levelName: 'N3', typeName: 'Ngữ pháp', imageUrls: [] }]
      if (path === '/api/nihongo-user/courses/42/vocabulary-deck') json = { id: 'n3', title: 'Từ vựng N3', level: 'N3', totalCards: 1, cards: [{ number: 1, unit: 1, word: '日本語', reading: 'にほんご', meaning: 'Tiếng Nhật' }] }
      if (path === '/api/nihongo-user/courses/42/conversation-listening') json = [{ id: 'n3-1', title: 'Hội thoại N3 – Bài 1', videoId: 'n3-test' }]
      await route.fulfill({ headers, json })
    })
    // Avoid loading an external video during this navigation check.
    await page.route('https://www.youtube-nocookie.com/**', route => route.abort())
    await page.goto('/course/book/30?courseId=42&lessonId=300')
    await expect(page.locator('.lesson-reading-content')).toHaveText('Nội dung N3')
    const sidebar = page.locator('#user-sidebar')
    const sections = sidebar.getByRole('list', { name: 'Nội dung Tiếng Nhật N3', exact: true, includeHidden: true })
    const select = async (name: string) => {
      if (width <= 768) await page.getByRole('button', { name: 'Mở menu học tập', exact: true }).click()
      await expect(sections.getByRole('link')).toHaveCount(3)
      await sections.getByRole('link', { name, exact: true }).click()
      if (width <= 768) await expect(sidebar).toBeHidden()
      await expect(sidebar.locator('.course-section').filter({ hasText: name })).toHaveAttribute('aria-current', 'page')
    }
    await select('Flashcard từ vựng')
    await expect(page).toHaveURL(/\/course\/42\/vocabulary-flashcards$/)
    await expect(page.locator('.card-front strong')).toHaveText('日本語')
    await page.getByRole('button', { name: 'Lật thẻ để xem đáp án' }).click()
    await expect(page.locator('.flip-card')).toHaveClass(/flipped/)
    await select('Hội thoại')
    await expect(page).toHaveURL(/\/course\/42\/conversation-listening$/)
    await expect(page.getByRole('heading', { name: 'Hội thoại N3 – Bài 1' })).toBeVisible()
    await select('Giáo trình sách')
    await expect(page).toHaveURL(/\/course\/42\/books$/)
    await expect(page.locator('.book-info h2')).toHaveText('Giáo trình N3')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width <= 768) await page.getByRole('button', { name: 'Mở menu học tập', exact: true }).click()
    await expect(sections.getByRole('link', { name: 'Giáo trình sách', exact: true })).toBeVisible()
    await page.screenshot({ path: `../tmp/n3-sidebar-sections-${width}.png`, animations: 'disabled' })
  })
}
