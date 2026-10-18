import { test, expect } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined })
for (const width of [1440, 390]) for (const kind of ['port', 'web'] as const) {
  test(`${kind} check registers a DOWN service and opens its performance page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.routeWebSocket(/.*/, socket => socket.close())
    const type = kind === 'port' ? 'PORT_CHECK' : 'WEB_CHECK'
    const code = kind === 'port' ? 'PORT_AVAILABLE' : 'WEB_AVAILABLE'
    const label = kind === 'port' ? 'Port Check' : 'Web Check'
    let registered = false
    const target = { vpsId: 91, name: 'Production check', type, host: 'example.com', port: 443, url: kind === 'web' ? 'https://example.com/health' : null, statusMin: 200, statusMax: 399, status: 'UNKNOWN', lastSeenAt: null }
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const path = new URL(route.request().url()).pathname
      const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      let json: unknown = []
      if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Staff test', email: 'staff@example.test', role: 'STAFF', sessionId: 'check-feature-test' }
      if (path === '/api/staff/check-targets/probe') json = { healthy: false, responseMs: 35, statusCode: kind === 'web' ? 503 : null, message: 'Dịch vụ đang DOWN.' }
      if (path === '/api/staff/check-targets/page') {
        const query = new URL(route.request().url()).searchParams
        expect(query.get('type')).toBe(type); expect(query.get('size')).toBe('20')
        json = { content: registered ? [target] : [], number: 0, hasNext: false }
      }
      if (path === '/api/staff/check-targets') {
        if (route.request().method() === 'POST') {
          const body = route.request().postDataJSON()
          expect(body.type).toBe(type)
          if (kind === 'web') expect(body.url).toBe('https://example.com/health')
          else { expect(body.host).toBe('example.com'); expect(body.port).toBe(443) }
          registered = true; json = target
        } else json = registered ? [target] : []
      }
      if (path === '/api/staff/vps') json = [{ vpsId: 91, hostname: target.name, ipAddress: target.host, agentPort: 443, exporterType: type, osType: label, status: 'DOWN' }]
      if (path === '/api/staff/vps-metrics') json = [{ metricId: 70, code, name: 'Khả dụng', unit: '', objectType: null, scheduleSeconds: 30, timeoutMs: 5000, enabled: true }]
      if (path === '/api/staff/vps/91/metric-configs') json = [{ assignmentId: 17, code, scheduleSeconds: null, effectiveScheduleSeconds: 30, enabled: true, lastError: 'Dịch vụ đang DOWN.', lastSuccessAt: null }]
      if (path === '/api/staff/vps/91/performance') json = { vpsId: 91, metricCode: code, state: 'DOWN', collectionError: 'Dịch vụ đang DOWN.', scheduleSeconds: 30, events: [], objects: [{ objectKey: 'vps', objectName: 'Khả dụng', labels: {}, status: 'ACTIVE', stale: false, points: [{ timestamp: Date.now() / 1000, value: 0 }] }] }
      if (path === '/api/notification/broadcasts') json = { content: [], totalPages: 0 }
      await route.fulfill({ headers, json })
    })
    await page.goto(`/staff/monitoring/register?type=${kind}`)
    await expect(page.getByRole('heading', { name: `Cấu hình ${label}`, exact: true })).toBeVisible()
    await page.getByLabel('Tên target', { exact: true }).fill('Production check')
    if (kind === 'web') await page.getByLabel('URL HTTP/HTTPS', { exact: true }).fill('https://example.com/health')
    else { await page.getByLabel('Hostname / IP', { exact: true }).fill('example.com'); await page.getByLabel('Cổng TCP', { exact: true }).fill('443') }
    await page.getByRole('button', { name: 'Kiểm tra ngay', exact: true }).click()
    await expect(page.locator('.probe-result')).toContainText('DOWN')
    await page.getByRole('button', { name: 'Đăng ký giám sát', exact: true }).click()
    await expect(page.locator('.registered')).toContainText('Đã đăng ký Production check')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `../tmp/${kind}-check-${width}.png`, fullPage: true })
    await page.getByRole('link', { name: 'Xem hiệu năng và cảnh báo', exact: true }).click()
    await expect(page).toHaveURL(/\/staff\/monitoring\/vps\/performance\?vps=91/)
    await expect(page.getByRole('heading', { name: `Hiệu năng ${label}`, exact: true })).toBeVisible()
    expect(registered).toBe(true)
  })
}
