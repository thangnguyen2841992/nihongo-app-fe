import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined, viewport: { width: 1440, height: 1000 } })
const book = JSON.parse(readFileSync(new URL('../../imports/try-n3/book.json', import.meta.url), 'utf8'))
const secondDraft = JSON.parse(readFileSync(new URL('../../nihongo-staff/src/main/resources/imports/try-n3/drafts/chapter-3.json', import.meta.url), 'utf8'))
const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS' }

test('shows all chapters, separates unreviewed OCR, and requires a reviewed valid package', async ({ page }) => {
  const progress = { bookName: book.bookName, bookId: 6, complete: false, chapters: book.chapters.map((c: any) => ({ ...c, reviewed: c.number <= 2, imported: c.number === 1 })) }
  await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    let json: any = []
    if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, role: 'STAFF', name: 'Kiểm thử', email: 'test@example.com', sessionId: 'book-import-test' }
    else if (path.endsWith('/book')) json = progress
    else if (path.endsWith('/chapters/3')) json = secondDraft
    else if (path.endsWith('/pages/43')) {
      await route.fulfill({ headers, contentType: 'image/png', body: readFileSync(new URL('../../nihongo-staff/src/main/resources/imports/try-n3/pages/43.png', import.meta.url)) }); return
    } else if (path.endsWith('/review')) {
      expect(route.request().postDataJSON().reviewed).toBe(true)
      await route.fulfill({ headers, status: 400, json: { message: 'Thiếu bài đọc, ngữ pháp hoặc phần bài tập.' } }); return
    }
    await route.fulfill({ headers, json })
  })
  await page.goto('/staff/imports/try-n3/book')
  await expect(page.locator('.chapter')).toHaveCount(11)
  await expect(page.getByRole('button', { name: 'Nhập các chương đã duyệt (1)' })).toBeEnabled()
  await page.locator('.chapter').nth(2).click()
  await expect(page.locator('.comparison img')).toBeVisible()
  await expect(page.locator('.comparison pre')).toContainText(secondDraft.pages[0].text)
  await expect(page.getByRole('button', { name: 'Lưu bản đã duyệt' })).toBeDisabled()
  await page.locator('input[type=file]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') })
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Lưu bản đã duyệt' }).click()
  await expect(page.getByRole('alert').first()).toContainText('Thiếu bài đọc')
  await expect(page.locator('.chapter').nth(2)).toContainText('Chờ đối chiếu')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '../imports/try-n3/book-import-progress.png' })
})

test('batch import resumes after the last committed chapter and stops at unreviewed content', async ({ page }) => {
  const progress = { bookName: book.bookName, bookId: 6, complete: false, chapters: book.chapters.map((c: any) => ({ ...c, reviewed: c.number <= 3, imported: c.number === 1 })) }
  const posts: number[] = []
  let failure = true
  await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    let json: any = []
    if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, role: 'STAFF', name: 'Kiểm thử', email: 'test@example.com', sessionId: 'book-import-test' }
    else if (path.endsWith('/book')) json = progress
    else if (path.endsWith('/import')) {
      const number = Number(path.split('/').at(-2)); posts.push(number)
      if (number === 3 && failure) { failure = false; await route.fulfill({ headers, status: 503, json: { message: 'Mất kết nối thử nghiệm.' } }); return }
      progress.chapters[number - 1].imported = true; json = progress
    }
    await route.fulfill({ headers, json })
  })
  await page.goto('/staff/imports/try-n3/book')
  await page.getByRole('button', { name: 'Nhập các chương đã duyệt (2)' }).click()
  await expect(page.getByRole('alert')).toContainText('Mất kết nối thử nghiệm.')
  await expect(page.locator('.progress-card')).toContainText('2/11 chương đã nhập')
  await page.getByRole('button', { name: 'Nhập các chương đã duyệt (1)' }).click()
  await expect(page.getByRole('status')).toContainText('3/11 chương')
  expect(posts).toEqual([2, 3, 3])
  await expect(page.getByRole('button', { name: 'Nhập các chương đã duyệt (0)' })).toBeDisabled()
})

test('completed book previews the final reading, audio and Vietnamese examples', async ({ page }) => {
  const content = JSON.parse(readFileSync(new URL('../../imports/try-n3/chapter-11.json', import.meta.url), 'utf8'))
  const progress = { bookName: book.bookName, bookId: 6, complete: true, chapters: book.chapters.map((c: any) => ({ ...c, imported: true })) }
  await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    if (path.endsWith('/pages/156')) {
      await route.fulfill({ headers, contentType: 'image/png', body: readFileSync(new URL('../../nihongo-staff/src/main/resources/imports/try-n3/pages/156.png', import.meta.url)) }); return
    }
    let json: any = []
    if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, role: 'STAFF', name: 'Kiểm thử', email: 'test@example.com', sessionId: 'full-preview-test' }
    else if (path.endsWith('/book')) json = progress
    else if (path.endsWith('/chapters/11')) json = content
    await route.fulfill({ headers, json })
  })
  await page.goto('/staff/imports/try-n3/book')
  await expect(page.locator('.progress-card')).toContainText('11/11 chương đã nhập')
  await expect(page.getByRole('button', { name: 'Nhập các chương đã duyệt (0)' })).toBeDisabled()
  await page.locator('.chapter').last().click()
  await expect(page.locator('.comparison img')).toBeVisible()
  await page.getByLabel('Phần học').selectOption('1')
  await expect(page.locator('audio')).toHaveAttribute('aria-label', 'Nghe CD 60')
  await expect(page.locator('.reviewed-reading')).toContainText('ゆきぬきではできない')
  await page.locator('.reviewed-content summary').last().click()
  await expect(page.locator('.reviewed-content details').last()).toContainText('Có lẽ do không khí khô')
  await expect(page.locator('.review-upload')).toHaveCount(0)
})
