import { test, expect } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined })

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  for (const width of [1440, 390]) {
    for (const role of ['USER', 'STAFF']) {
    test(`${role} ticker stays inside content and moves slowly right to left at ${width}px with motion preference ${reducedMotion}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ reducedMotion })
      await page.routeWebSocket(/.*/, socket => socket.close())
      await page.route(url => url.pathname.startsWith('/api/'), async route => {
        const path = new URL(route.request().url()).pathname
        const headers = {
          'access-control-allow-origin': 'http://localhost:5173',
          'access-control-allow-credentials': 'true',
          'access-control-allow-headers': 'Content-Type,Cache-Control',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
        }
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
        let json: unknown = []
        if (path === '/api/auth/checkLogin') json = {
          isLoggedIn: true, name: 'Ticker test', email: 'ticker@example.test', role, sessionId: 'ticker-test',
        }
        if (path === '/api/notification/broadcasts') json = {
          content: [{ id: 42, title: 'Thông báo', content: width === 390 ? 'Xin chào' : 'Nội dung dài cần đọc chậm. '.repeat(60), audience: 'ALL', createdAt: new Date().toISOString() }],
          totalPages: 1,
        }
        await route.fulfill({ headers, json })
      })
      await page.goto('/')
      const line = page.locator('.broadcast-ticker .ticker-line')
      await expect(line).toBeVisible()
      const bounds = await page.locator('.broadcast-ticker').evaluate(element => ({
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
        overflow: getComputedStyle(element).overflow,
      }))
      const content = await page.locator('main.workspace-content').boundingBox()
      expect(content).not.toBeNull()
      expect(bounds.left).toBeCloseTo(content!.x, 0)
      expect(bounds.right).toBeCloseTo(content!.x + content!.width, 0)
      expect(bounds.overflow).toBe('hidden')
      await expect.poll(() => line.evaluate(element => getComputedStyle(element).animationDuration)).not.toBe('1e-05s')
      const sample = () => line.evaluate(element => ({ x: element.getBoundingClientRect().x, time: performance.now() }))
      const before = await sample()
      await page.waitForTimeout(1500)
      const after = await sample()
      const speed = (after.x - before.x) / ((after.time - before.time) / 1000)
      expect(speed).toBeGreaterThan(-23)
      expect(speed).toBeLessThan(-17)
      // Refreshing the same broadcast must preserve both its DOM and animation position.
      await line.evaluate(element => { element.setAttribute('data-original-line', 'true') })
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await expect(line).toHaveAttribute('data-original-line', 'true')
      await expect(line).toBeVisible()
    })
    }
  }
}
