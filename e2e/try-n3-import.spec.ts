import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined, viewport: { width: 1440, height: 1000 } })
const chapter = JSON.parse(readFileSync(new URL('../../imports/try-n3/chapter-1.json', import.meta.url), 'utf8'))

test('previews chapter one, grades the original questions and opens the imported book', async ({ page }) => {
  page.on('pageerror', error => console.error('Browser error:', error.message))
  await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
  // Test-only API responses; the real database import is verified separately by the local runner.
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url())
    const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers })
      return
    }
    if (url.pathname === '/api/auth/checkLogin') {
      await route.fulfill({ headers, json: { isLoggedIn: true, name: 'Kiểm thử', email: 'test@example.com', role: 'STAFF', sessionId: 'try-n3-test' } })
    } else if (url.pathname === '/api/staff/imports/try-n3/chapter-1') {
      await route.fulfill({ headers, json: route.request().method() === 'POST' ? { bookId: 6, alreadyImported: false } : { chapter, importedBookId: null } })
    } else if (url.pathname.endsWith('/pages/15')) {
      await route.fulfill({ headers, contentType: 'image/png', body: readFileSync(new URL('../../nihongo-staff/src/main/resources/imports/try-n3/pages/15.png', import.meta.url)) })
    } else {
      await route.fulfill({ headers, json: [] })
    }
  })
  await page.goto('/staff/imports/try-n3')
  await expect(page.getByRole('heading', { name: 'Lần đầu leo núi Phú Sĩ', exact: true })).toBeVisible()
  await expect(page.locator('.grammar')).toHaveCount(5)
  await expect(page.locator('.reading')).toContainText('先週の日曜日')
  await expect(page.locator('.lesson-panel audio')).toHaveAttribute('aria-label', 'Nghe CD 02')
  await expect(page.locator('.example-translation').first()).toContainText('Tôi bắt đầu học tiếng Nhật')
  await expect(page.locator('.grammar-notes .formula').first()).toContainText('V bỏ ます + 始める')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: '../imports/try-n3/preview.png' })
  await page.getByRole('button', { name: '02. Lần đầu leo núi Phú Sĩ (2)', exact: true }).click()
  await expect(page.locator('.reading')).toContainText('でも、登ってみると')
  await expect(page.locator('.lesson-panel audio')).toHaveAttribute('aria-label', 'Nghe CD 03')
  await expect(page.locator('.grammar').first()).toContainText('06. 登ってみると')
  const answers = ['C', 'A', 'D', 'B', 'C', 'A', 'B', 'A', 'B', 'A', 'A', 'A', 'C', 'C', 'A', 'A', 'D', 'A']
  for (let i = 0; i < answers.length; i++) await page.locator(`input[name="question-${i + 1}"][value="${answers[i]}"]`).check()
  await page.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click()
  await expect(page.getByText('Bạn trả lời đúng 18/18 câu.')).toBeVisible()
  await page.getByRole('button', { name: 'Xem trang gốc', exact: true }).click()
  await expect(page.locator('.source-image')).toBeVisible()
  await expect.poll(() => page.locator('.source-image').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(1000)
  await page.getByRole('button', { name: 'Nhập chương 1', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Mở sách đã nhập', exact: true })).toHaveAttribute('href', '/staff/books/6')
})
