import { test, expect, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

test.use({
  headless: true,
  channel: process.platform === 'win32' ? 'msedge' : undefined,
  viewport: { width: 1440, height: 1000 },
})

async function session(page: Page, signedIn: boolean) {
  const uploads: string[] = []
  await page.routeWebSocket(/.*/, (socket) => socket.close())
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      if (['POST', 'PUT', 'PATCH'].includes(request.method())) uploads.push(path)
      const headers = {
        'access-control-allow-origin': 'http://localhost:5173',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'Content-Type,Cache-Control',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
      }
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let json: unknown = []
      if (path === '/api/auth/checkLogin')
        json = signedIn
          ? {
              isLoggedIn: true,
              name: 'English learner',
              email: 'english@example.test',
              role: 'USER',
              sessionId: 'english-session',
            }
          : { isLoggedIn: false }
      if (path.includes('/wallet')) json = { balance: 0 }
      if (path === '/api/notification/broadcasts') json = { content: [], totalPages: 0 }
      await route.fulfill({ headers, json })
    },
  )
  return uploads
}

test('private reading desk saves notes, opens local media without uploads and fits mobile', async ({
  page,
}) => {
  const uploads = await session(page, true)
  await page.goto('/user/english')
  await expect(page.getByRole('heading', { name: 'Mỗi ngày, một chút tiếng Anh.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tiếng Anh cá nhân', exact: true })).toBeVisible()
  await expect(page.locator('.book-card')).toHaveCount(3)
  await page.getByLabel('Bài đang học', { exact: true }).fill('Unit 1 — Getting started')
  await page.getByLabel('Số bài đã học', { exact: true }).fill('2')
  await page.getByLabel('Tổng số bài', { exact: true }).fill('20')
  await page
    .getByLabel('Điều mình muốn nhớ', { exact: true })
    .fill('I am learning English every day.\nMình dùng “am” với chủ ngữ “I”.')
  await page.getByRole('button', { name: 'Lưu tiến độ và ghi chú' }).click()
  await expect(page.getByRole('status')).toContainText('Đã lưu')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: 'test-results/english-desktop.png', fullPage: true })
  await page.reload()
  await expect(page.getByLabel('Bài đang học', { exact: true })).toHaveValue(
    'Unit 1 — Getting started',
  )
  await expect(page.getByLabel('Điều mình muốn nhớ', { exact: true })).toHaveValue(
    /I am learning English every day\./,
  )

  await page
    .getByLabel('Chọn sách PDF từ máy')
    .setInputFiles({ name: 'personal-example.pdf', mimeType: 'application/pdf', buffer: tinyPdf() })
  await expect(page.locator('object.pdf-reader')).toHaveAttribute(
    'data',
    /^blob:.*#page=1&view=FitH$/,
  )
  await page.getByLabel('Trang', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Đến trang', exact: true }).click()
  await expect(page.locator('object.pdf-reader')).toHaveAttribute('data', /#page=2/)

  const wav = Buffer.alloc(8044)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(wav.length - 8, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(8000, 24)
  wav.writeUInt32LE(8000, 28)
  wav.writeUInt16LE(1, 32)
  wav.writeUInt16LE(8, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(8000, 40)
  wav.fill(128, 44)
  await page.getByLabel('Chọn các file audio từ máy').setInputFiles([
    { name: 'Track 10.wav', mimeType: 'audio/wav', buffer: wav },
    { name: 'Track 2.wav', mimeType: 'audio/wav', buffer: wav },
  ])
  await expect(page.locator('#english-track option').first()).toHaveText('Track 2.wav')
  await expect(page.locator('audio')).toHaveAttribute('src', /^blob:/)
  await page.getByLabel('Tốc độ nghe').selectOption('0.75')
  await expect
    .poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.playbackRate))
    .toBe(0.75)
  expect(uploads).toEqual([])

  await page.getByRole('button', { name: /03 \/ Phát âm/ }).click()
  await expect(page.locator('object.pdf-reader')).toHaveCount(0)
  await expect(page.locator('audio')).toHaveCount(0)
  await expect(page.getByLabel('Điều mình muốn nhớ', { exact: true })).toHaveValue('')
  await expect(page.getByRole('link', { name: /Xem thử phần giới thiệu/ })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: 'test-results/english-mobile.png', fullPage: true })
  expect(uploads).toEqual([])
})

test('requires a session before showing the personal English desk', async ({ page }) => {
  await session(page, false)
  await page.goto('/user/english')
  await expect(page).toHaveURL(/\/login\?redirect=\/user\/english$/)
  await expect(page.locator('.english-desk')).toHaveCount(0)
})

test('shows built-in lesson JSON immediately and after reload without selecting a file', async ({
  page,
}) => {
  const uploads = await session(page, true)
  await page.goto('/user/english')
  await expect(page.locator('.unit-list button')).toHaveCount(115)
  await expect(page.locator('.example-vi')).toHaveText('Chị tôi là y tá.')
  await expect(page.locator('object.pdf-reader')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Mở PDF gốc để đối chiếu', exact: true }),
  ).toBeVisible()
  await page.getByLabel('Tìm bài học', { exact: true }).fill('hien tai hoan thanh')
  await expect(page.locator('.unit-list button')).toHaveCount(6)
  await page.getByLabel('Tìm bài học', { exact: true }).fill('115')
  await page.locator('.unit-list button').click()
  await page.getByRole('button', { name: 'Lưu tiến độ và ghi chú' }).click()
  await page.reload()
  await expect(page.locator('#bilingual-lesson-title')).toContainText('put on your shoes')
  await expect(page.locator('.unit-list button')).toHaveCount(115)
  await expect(page.locator('object.pdf-reader')).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  expect(uploads).toEqual([])
})

test('opens all 115 bilingual units from the supplied personal book and links to original pages', async ({
  page,
}) => {
  test.setTimeout(60000)
  const personalPack = resolve('../output/english/essential-grammar-vi.english-study.json')
  // Personal PDF packages are deliberately excluded from the repository and CI.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(
    !existsSync(personalPack),
    'Generate the private study package from the supplied PDF first.',
  )
  const uploads = await session(page, true)
  await page.goto('/user/english')
  await page.getByLabel('Chọn bản học Anh–Việt', { exact: true }).setInputFiles(personalPack)
  await expect(
    page.getByRole('heading', { name: 'Hiểu bằng tiếng Việt. Luyện bằng tiếng Anh.' }),
  ).toBeVisible()
  await expect(page.locator('.unit-list button')).toHaveCount(115)
  await expect(page.locator('.example-en')).toHaveText('My sister is a nurse.')
  await expect(page.locator('.example-vi')).toHaveText('Chị tôi là y tá.')
  await page.locator('.grammar-practice input[type="radio"]').first().check()
  await expect(page.locator('.practice-result')).toHaveCount(0)
  await page.getByRole('button', { name: 'Kiểm tra đáp án', exact: true }).click()
  await expect(page.locator('.practice-result')).toContainText('Đáp án: are')
  await page.locator('.grammar-companion').screenshot({
    path: 'test-results/english-bilingual-desktop.png',
    style:
      '.navbar-custom, .floating-actions, .support-chat, .ai-popup-host { visibility: hidden !important; }',
  })
  await page.getByLabel('Tìm bài học', { exact: true }).fill('115')
  await expect(page.locator('.unit-list button')).toHaveCount(1)
  await page.locator('.unit-list button').click()
  await expect(page.locator('#bilingual-lesson-title')).toContainText('put on your shoes')
  await expect(page.locator('.practice-result')).toHaveCount(0)
  await page.getByRole('button', { name: 'Bài tập gốc · PDF 240', exact: true }).click()
  await expect(page.locator('object.pdf-reader')).toHaveAttribute('data', /#page=240/)
  await expect(page.getByLabel('Bài đang học', { exact: true })).toHaveValue(/Unit 115/)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await page.locator('.grammar-companion').screenshot({
    path: 'test-results/english-bilingual-mobile.png',
    style:
      '.navbar-custom, .floating-actions, .support-chat, .ai-popup-host { visibility: hidden !important; }',
  })
  expect(uploads).toEqual([])
})

function tinyPdf() {
  const stream = 'BT /F1 18 Tf 50 750 Td (Personal study sample) Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let document = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(document.length)
    document += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = document.length
  document += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(document)
}
