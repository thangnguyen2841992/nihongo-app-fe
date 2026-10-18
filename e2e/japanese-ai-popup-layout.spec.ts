import { test, expect } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined })

for (const width of [1440, 390, 320]) {
  test(`AI popup fits its content without horizontal scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.routeWebSocket(/.*/, socket => socket.close())
    const longText = 'LongUnbrokenText'.repeat(40)
    let completeAnalysis!: () => void
    const analysisReady = new Promise<void>(resolve => { completeAnalysis = resolve })
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const headers = {
        'access-control-allow-origin': 'http://localhost:5173',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'Content-Type,Cache-Control',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
      }
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      const path = new URL(route.request().url()).pathname
      let json: unknown = []
      if (path === '/api/auth/checkLogin') json = {
        isLoggedIn: true, name: 'Layout test', email: 'layout@example.test', role: 'USER', sessionId: 'ai-layout-test',
      }
      if (path === '/api/notification/broadcasts') json = { content: [], totalPages: 0 }
      if (path === '/api/nihongo-user/japanese') {
        await analysisReady
        json = {
          originalText: longText, translation: longText, reading: longText,
          vocabulary: [{ word: longText, reading: longText, kanjiReading: longText, meaning: longText }],
          grammar: [{ pattern: longText, explanation: longText }],
          sentenceStructure: longText, examples: [longText],
        }
      }
      await route.fulfill({ headers, json })
    })
    await page.goto('/courses')
    await page.getByRole('button', { name: 'Mở trợ lý tiếng Nhật', exact: true }).click()
    const popup = page.getByRole('dialog', { name: 'Trợ lý tiếng Nhật' })
    const body = popup.locator('.ai-popup-body')
    const expectNoOverflow = async () => {
      const overflow = await body.evaluate(element => element.scrollWidth - element.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)
    }
    await expect(popup.getByLabel('Nội dung phân tích')).toBeVisible()
    await expectNoOverflow()
    await popup.getByLabel('Nội dung phân tích').fill('日本語')
    await popup.getByRole('button', { name: '🔍 Phân tích', exact: true }).click()
    await expect(popup.getByRole('status')).toBeVisible()
    await expectNoOverflow()
    completeAnalysis()
    await expect(popup.locator('.vocabulary-word > span')).toHaveText(longText)
    await expectNoOverflow()
    // Verify content wraps inside its cards rather than merely being clipped by the popup.
    const overflowing = await popup.locator('.result-card, .vocabulary-item, .vocabulary-word, .reading-row, .search-card').evaluateAll(elements =>
      elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.className),
    )
    expect(overflowing).toEqual([])
    expect(await body.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
    await popup.locator('.example-text').scrollIntoViewIfNeeded()
    await expect(popup.locator('.example-text')).toBeVisible()
  })
}
