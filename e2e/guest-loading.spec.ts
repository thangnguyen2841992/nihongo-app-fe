import { test, expect } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined })

test('guest catalog does not load signed-in widgets or private navigation', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(new URL(request.url()).pathname))
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true' }
    await route.fulfill({ headers, json: path === '/api/auth/checkLogin' ? { isLoggedIn: false } : [] })
  })
  await page.goto('/courses')
  await expect(page.getByRole('heading', { name: 'Khóa học tiếng Nhật', exact: true })).toBeVisible()
  await expect(page.getByText('Chưa có khóa học nào', { exact: true })).toBeVisible()
  expect(requests.filter(path => /\/(WalletNotifications|SupportChatWidget|JapaneseAiPopup|StaffNavbar|StaffSidebar|Navbar|Sidebar)(?:\.vue|-[\w-]+\.js)$/.test(path))).toEqual([])
  expect(requests.filter(path => path.startsWith('/api/') && !['/api/auth/checkLogin', '/api/auth/refresh', '/api/nihongo-user/courses'].includes(path))).toEqual([])
})
