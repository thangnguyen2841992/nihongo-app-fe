import { test, expect } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined })
for (const role of ['STAFF', 'ADMIN', 'USER'])
  for (const width of [1440, 390]) {
    test(`${role} opens and closes its sidebar at ${width}px and keeps desktop preference across resize`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.routeWebSocket(/.*/, (socket) => socket.close())
      await page.route(
        (url) => url.pathname.startsWith('/api/'),
        async (route) => {
          const path = new URL(route.request().url()).pathname
          const headers = {
            'access-control-allow-origin': 'http://localhost:5173',
            'access-control-allow-credentials': 'true',
            'access-control-allow-headers': 'Content-Type,Cache-Control',
            'access-control-allow-methods': 'GET,POST,OPTIONS',
          }
          if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
          let json: unknown = []
          if (path === '/api/auth/checkLogin')
            json = {
              isLoggedIn: true,
              name: 'Sidebar test',
              email: 'sidebar@example.test',
              role,
              sessionId: 'sidebar-test',
            }
          if (path === '/api/staff/vps')
            json = [
              {
                vpsId: 1,
                hostname: 'Server test',
                ipAddress: '127.0.0.1',
                agentPort: 9100,
                exporterType: 'NODE_EXPORTER',
                status: 'UP',
                osType: 'Linux',
                lastSeenAt: '',
              },
            ]
          if (path === '/api/notification/broadcasts') json = { content: [], totalPages: 0 }
          if (role === 'USER' && path === '/api/notification/broadcasts') json = { content: [{ id: 42, title: 'Thông báo kiểm thử', content: 'Sidebar user', audience: 'ALL', createdAt: new Date().toISOString() }], totalPages: 1 }
          if (path.includes('/wallet')) json = { balance: 0 }
          if (path === '/api/nihongo-user/study/dashboard') json = { dueCards: 0, weakLessons: 0, attempts: 0, lessons: 0, averageScore: 0, cardsToday: 0, attemptsToday: 0, practiceToday: 0, goalCompleted: false, streak: 0, longestStreak: 0, today: '2026-10-18', timeZone: 'Asia/Bangkok', goal: { dailyCards: 10, dailyAttempts: 1, remindersEnabled: false }, trend: [], reminders: [] }
          await route.fulfill({ headers, json })
        },
      )
      const staff = role === 'STAFF'
      const user = role === 'USER'
      await page.goto(staff ? '/staff/monitoring/topology' : user ? '/courses' : '/admin/dashboard')
      const sidebar = page.locator(
        staff ? '#staff-sidebar' : user ? '#user-sidebar' : '#admin-sidebar',
      )
      const navbar = page.locator(
        staff ? '.staff-navbar' : user ? '.navbar-custom' : '.admin-navbar',
      )
      const label = staff ? 'menu nhân viên' : user ? 'menu học tập' : 'menu quản trị'
      const open = () => page.getByRole('button', { name: `Mở ${label}`, exact: true })
      const close = () => page.getByRole('button', { name: `Đóng ${label}`, exact: true })
      if (width > 768) {
        await expect(sidebar).toBeVisible()
        const before = await page.locator('main.workspace-content').boundingBox()
        await close().click()
        await expect(sidebar).toBeHidden()
        const after = await page.locator('main.workspace-content').boundingBox()
        expect(after!.width - before!.width).toBeGreaterThan(user ? 230 : 260)
        expect((await navbar.boundingBox())!.x).toBe(0)
        if (user) {
          await expect(page.locator('.broadcast-ticker')).toBeVisible()
          await expect.poll(async () => (await page.locator('.broadcast-ticker').boundingBox())!.x).toBe(0)
        }
      } else {
        await expect(sidebar).toBeHidden()
      }
      await open().click()
      await expect(sidebar).toBeVisible()
      await expect(close()).toHaveAttribute('aria-expanded', 'true')
      if (!staff) {
        const destination = user ? '/' : '/admin/dashboard'
        await sidebar.locator(`a[href="${destination}"]`).first().click()
        if (width > 768) await expect(sidebar).toBeVisible()
        else {
          await expect(sidebar).toBeHidden()
          await open().click()
        }
      }
      await sidebar.getByRole('button', { name: 'Đóng menu', exact: true }).click()
      await expect(sidebar).toBeHidden()
      if (width <= 768) {
        await open().click()
        await page
          .locator(user ? '.sidebar-overlay' : '.sidebar-backdrop')
          .click({ position: { x: width - 4, y: 500 } })
        await expect(sidebar).toBeHidden()
      }
      await page.setViewportSize({ width: 1440, height: 1000 })
      if (width <= 768) {
        await expect(sidebar).toBeVisible()
        await close().click()
      } else await expect(sidebar).toBeHidden()
      await page.setViewportSize({ width: 390, height: 1000 })
      await expect(sidebar).toBeHidden()
      await page.setViewportSize({ width: 1440, height: 1000 })
      await expect(sidebar).toBeHidden()
      await open().click()
      await expect(sidebar).toBeVisible()
      await page.setViewportSize({ width: 769, height: 1000 })
      await expect(close()).toBeVisible()
      if (!user)
        await expect
          .poll(
            async () => (await close().boundingBox())!.x >= (await sidebar.boundingBox())!.width,
          )
          .toBe(true)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true)
      await page.screenshot({ path: `../tmp/sidebar-${role}-${width}.png` })
    })
  }
