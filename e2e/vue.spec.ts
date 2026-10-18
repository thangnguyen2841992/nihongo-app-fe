import { test, expect } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined })

test('redirects guests from the root to the public course catalog', async ({ page }) => {
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const headers = {
      'access-control-allow-origin': 'http://localhost:5173',
      'access-control-allow-credentials': 'true',
    }
    const path = new URL(route.request().url()).pathname
    await route.fulfill({ headers, json: path === '/api/auth/checkLogin' ? { isLoggedIn: false } : [] })
  })
  await page.goto('/')
  await expect(page).toHaveURL(/\/courses$/)
  await expect(page.getByRole('heading', { name: 'Khóa học tiếng Nhật', exact: true })).toBeVisible()
})
