import { test, expect } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined })

for (const width of [1440, 390]) {
  for (const role of ['USER', 'STAFF']) {
    test(`${role} can open AI without overlapping scroll buttons at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.routeWebSocket(/.*/, socket => socket.close())
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
          isLoggedIn: true, name: 'Layout test', email: 'layout@example.test', role, sessionId: 'layout-test',
        }
        if (path === '/api/notification/broadcasts') json = { content: [], totalPages: 0 }
        await route.fulfill({ headers, json })
      })
      await page.goto('/courses')
      if (role === 'STAFF' && width === 390) {
        const sidebar = page.getByRole('complementary', { name: 'Điều hướng nhân viên', includeHidden: true })
        await expect(sidebar).toBeHidden()
        await page.getByRole('button', { name: 'Mở menu nhân viên', exact: true }).click()
        await expect(sidebar).toBeVisible()
        await sidebar.getByRole('button', { name: 'Đóng menu', exact: true }).click()
        await expect(sidebar).toBeHidden()
      }
      const launcher = page.getByRole('button', { name: 'Mở trợ lý tiếng Nhật', exact: true })
      await expect(launcher).toBeVisible()
      await page.evaluate(() => {
        document.body.style.minHeight = '3000px'
        window.scrollTo({ top: 500, behavior: 'instant' })
      })
      const up = page.getByTitle('Lên đầu trang', { exact: true })
      const down = page.getByTitle('Xuống cuối trang', { exact: true })
      await expect(up).toBeVisible()
      await expect(down).toBeVisible()
      const aiBounds = (await launcher.boundingBox())!
      for (const button of [up, down]) {
        const bounds = (await button.boundingBox())!
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(aiBounds.y - 8)
      }
      // A real click must reach the launcher rather than the floating scroll controls.
      await launcher.click()
      await expect(page.getByRole('dialog', { name: 'Trợ lý tiếng Nhật' })).toBeVisible()
      await expect(up).toBeHidden()
      await expect(down).toBeHidden()
      await page.getByRole('button', { name: 'Thu nhỏ trợ lý AI', exact: true }).click()
      await expect(launcher).toBeVisible()
      await expect(up).toBeVisible()
      await expect(down).toBeVisible()
    })
  }
}
