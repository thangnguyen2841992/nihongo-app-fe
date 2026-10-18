import { test, expect } from '@playwright/test'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined })
for (const width of [1440, 390]) {
  test(`topology map shows target icons, filters, zoom and target details at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.routeWebSocket(/.*/, (socket) => socket.close())
    const rows = [
      'NODE_EXPORTER',
      'WINDOWS_EXPORTER',
      'MYSQL_JDBC',
      'KAFKA_ADMIN',
      'PORT_CHECK',
      'WEB_CHECK',
    ].map((exporterType, index) => ({
      vpsId: index + 1,
      hostname: [
        'Linux production',
        'Windows backup',
        'MySQL primary',
        'Kafka events',
        'SSH service',
        'Website health',
      ][index],
      exporterType,
      ipAddress: `10.10.0.${index + 1}`,
      agentPort: 9000 + index,
      status: index === 2 ? 'DOWN' : index === 4 ? 'UNKNOWN' : 'UP',
      osType: index === 1 ? 'Windows' : 'Linux',
      lastSeenAt: '2026-10-17T10:00:00',
    }))
    let rejectRegistration = true
    await page.route(
      (url) => url.pathname.startsWith('/api/'),
      async (route) => {
        const path = new URL(route.request().url()).pathname
        const headers = {
          'access-control-allow-origin': 'http://localhost:5173',
          'access-control-allow-credentials': 'true',
          'access-control-allow-headers': 'Content-Type',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
        }
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
        let json: unknown = []
        if (path === '/api/auth/checkLogin')
          json = {
            isLoggedIn: true,
            name: 'Topology staff',
            email: 'staff@example.test',
            role: 'STAFF',
            sessionId: 'topology-test',
          }
        if (path === '/api/staff/vps') json = rows
        if (path === '/api/staff/check-targets/page')
          json = { content: [], number: 0, hasNext: false }
        if (path === '/api/staff/check-targets' && route.request().method() === 'POST') {
          if (rejectRegistration) {
            rejectRegistration = false
            return route.fulfill({ headers, status: 409, json: { message: 'Target đã tồn tại.' } })
          }
          const body = route.request().postDataJSON()
          expect(body.type).toBe('PORT_CHECK')
          rows.push({
            vpsId: 7,
            hostname: body.name,
            exporterType: 'PORT_CHECK',
            ipAddress: body.host,
            agentPort: body.port,
            status: 'UNKNOWN',
            osType: 'Port Check',
            lastSeenAt: '',
          })
          json = {
            vpsId: 7,
            name: body.name,
            type: 'PORT_CHECK',
            host: body.host,
            port: body.port,
            status: 'UNKNOWN',
            lastSeenAt: null,
          }
        }
        if (path === '/api/notification/broadcasts') json = { content: [], totalPages: 0 }
        await route.fulfill({ headers, json })
      },
    )
    await page.goto('/staff/monitoring/topology')
    await expect(
      page.getByRole('heading', { name: 'Topology tổng quan', exact: true }),
    ).toBeVisible()
    await expect(page.locator('.target-node')).toHaveCount(6)
    await expect(page.getByRole('navigation', { name: 'Cây loại target' })).toBeVisible()
    const tree = page.getByRole('navigation', { name: 'Cây loại target' })
    const beforeTreeToggle = await page.locator('.map-viewport').boundingBox()
    await page.getByRole('button', { name: 'Ẩn cây Type', exact: true }).click()
    await expect(tree).toBeHidden()
    if (width === 1440)
      expect(
        (await page.locator('.map-viewport').boundingBox())!.width - beforeTreeToggle!.width,
      ).toBeGreaterThan(200)
    await page.getByRole('button', { name: 'Hiện cây Type', exact: true }).click()
    await expect(tree).toBeVisible()
    await page.locator('[data-type="MYSQL_JDBC"]').click()
    await expect(page.getByRole('button', { name: 'Thu gọn MySQL', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    await page.getByRole('button', { name: 'Vừa màn hình', exact: true }).click()
    await expect(page.locator('.target-node')).toHaveCount(1)
    const node = page.getByRole('button', { name: 'MySQL primary, MySQL, DOWN', exact: true })
    const circle = await node.locator('.target-circle').boundingBox()
    const name = await node.locator('.target-name').boundingBox()
    expect(Math.abs(circle!.width - circle!.height)).toBeLessThan(1)
    expect(name!.y).toBeGreaterThan(circle!.y + circle!.height)
    expect(
      await node
        .locator('.target-circle')
        .evaluate((element) => getComputedStyle(element).borderRadius),
    ).toBe('50%')
    await node.click()
    await expect(page.getByRole('complementary', { name: 'Chi tiết target' })).toContainText(
      '10.10.0.3',
    )
    await expect(page.getByRole('link', { name: 'Xem hiệu năng', exact: true })).toHaveAttribute(
      'href',
      '/staff/monitoring/vps/performance?vps=3',
    )
    await page.getByRole('button', { name: 'Đóng chi tiết' }).click()
    const zoomBefore = await page.getByLabel('Mức thu phóng').textContent()
    await page.getByRole('button', { name: 'Phóng to', exact: true }).click()
    await expect(page.getByLabel('Mức thu phóng')).not.toHaveText(zoomBefore!)
    await page.getByRole('button', { name: 'Vừa màn hình', exact: true }).click()
    if (width === 1440) {
      const before = await node.boundingBox()
      expect(before).not.toBeNull()
      await page.mouse.move(before!.x + 30, before!.y + 20)
      await page.mouse.down()
      await page.mouse.move(before!.x + 90, before!.y + 70, { steps: 5 })
      await page.mouse.up()
      const after = await node.boundingBox()
      expect(after!.x - before!.x).toBeGreaterThan(40)
      const map = await page.locator('.map-viewport').boundingBox()
      await page.mouse.move(after!.x + 70, after!.y + 35)
      await page.mouse.down()
      await page.mouse.move(map!.x + 10, map!.y + 10, { steps: 8 })
      await page.mouse.up()
      const position = await node.evaluate((element) => ({
        x: parseFloat((element as HTMLElement).style.left),
        y: parseFloat((element as HTMLElement).style.top),
      }))
      expect(position.x).toBeLessThan(0)
      expect(position.y).toBeLessThan(0)
      await page.getByRole('button', { name: 'Vừa màn hình', exact: true }).click()
      await expect(node.locator('.target-circle')).toBeInViewport()
      await page.getByRole('button', { name: 'Làm mới', exact: true }).click()
      await expect(node).toHaveAttribute('style', new RegExp(`left: ${position.x}px`))
      await page
        .locator('.map-viewport')
        .click({ button: 'right', position: { x: map!.width - 8, y: map!.height - 8 } })
      const menu = page.getByRole('menu', { name: 'Thao tác topology' })
      await expect(menu).toBeVisible()
      const menuBox = await menu.boundingBox()
      expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(map!.x + map!.width)
      expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(map!.y + map!.height)
      await page.getByRole('menuitem', { name: 'Sắp xếp tự động' }).click()
      await expect(menu).toHaveCount(0)
      const centered = await node.boundingBox()
      const centeredMap = await page.locator('.map-viewport').boundingBox()
      expect(
        Math.abs(centered!.x + centered!.width / 2 - (centeredMap!.x + centeredMap!.width / 2)),
      ).toBeLessThan(2)
      expect(
        Math.abs(centered!.y + centered!.height / 2 - (centeredMap!.y + centeredMap!.height / 2)),
      ).toBeLessThan(2)
    }
    await page.getByRole('button', { name: 'Tất cả target', exact: false }).click()
    await page.locator('.map-viewport').click({ button: 'right', position: { x: 20, y: 20 } })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu', { name: 'Thao tác topology' })).toHaveCount(0)
    await page.locator('.map-viewport').click({ button: 'right', position: { x: 20, y: 20 } })
    await page.getByRole('heading', { name: 'Topology tổng quan', exact: true }).click()
    await expect(page.getByRole('menu', { name: 'Thao tác topology' })).toHaveCount(0)
    await page.locator('.map-viewport').click({ button: 'right', position: { x: 20, y: 20 } })
    await page.getByRole('menuitem', { name: 'Sắp xếp tự động' }).click()
    const mapBounds = await page.locator('.map-viewport').boundingBox()
    const nodeBounds = await page.locator('.target-node').evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect()
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
      }),
    )
    expect(
      Math.abs(
        (Math.min(...nodeBounds.map((box) => box.left)) +
          Math.max(...nodeBounds.map((box) => box.right))) /
          2 -
          (mapBounds!.x + mapBounds!.width / 2),
      ),
    ).toBeLessThan(2)
    expect(
      Math.abs(
        (Math.min(...nodeBounds.map((box) => box.top)) +
          Math.max(...nodeBounds.map((box) => box.bottom))) /
          2 -
          (mapBounds!.y + mapBounds!.height / 2),
      ),
    ).toBeLessThan(2)
    await page.getByRole('button', { name: 'Vừa màn hình', exact: true }).click()
    await expect(page.locator('.target-node')).toHaveCount(6)
    await page.getByRole('button', { name: 'Thu gọn MySQL', exact: true }).click()
    await page.getByRole('button', { name: 'Mở rộng MySQL', exact: true }).click()
    await page.locator('#type-children-MYSQL_JDBC button').click()
    await expect(page.getByRole('complementary', { name: 'Chi tiết target' })).toContainText(
      'MySQL primary',
    )
    await page.getByRole('button', { name: 'Đóng chi tiết' }).click()
    await page.getByRole('button', { name: 'Tất cả target', exact: false }).click()
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
    await page.screenshot({ path: `../tmp/topology-${width}.png`, fullPage: true })
    await page.getByLabel('Tìm target', { exact: true }).fill('does-not-exist')
    await expect(page.getByText('Không có target phù hợp bộ lọc.', { exact: true })).toBeVisible()
    await page.locator('.map-viewport').click({ button: 'right', position: { x: 20, y: 20 } })
    await expect(page.getByRole('menuitem', { name: 'Sắp xếp tự động' })).toBeDisabled()
    await page.getByRole('menuitem', { name: 'Tạo target', exact: true }).click()
    const popup = page.getByRole('dialog', { name: 'Tạo target', exact: true })
    await expect(popup).toBeVisible()
    await expect(page).toHaveURL(/\/staff\/monitoring\/topology$/)
    await expect(page.getByRole('menu', { name: 'Thao tác topology' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(popup).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    await page.getByRole('button', { name: 'Tạo target', exact: true }).click()
    await expect(popup).toBeVisible()
    await page.mouse.click(2, 2)
    await expect(popup).toHaveCount(0)
    await page.getByRole('button', { name: 'Tạo target', exact: true }).click()
    await popup.locator('.os-card').filter({ hasText: 'Windows' }).click()
    await expect(popup.locator('#vps-port')).toHaveValue('9182')
    await popup.locator('.type-card').filter({ hasText: 'Port Check' }).click()
    await expect(page).toHaveURL(/\/staff\/monitoring\/topology$/)
    await popup.locator('#port-name').fill('New TCP target')
    await popup.locator('#check-host').fill('127.0.0.1')
    await popup.locator('#check-port').fill('22')
    await expect
      .poll(() => popup.evaluate((element) => element.scrollWidth <= element.clientWidth))
      .toBe(true)
    await popup.screenshot({ path: `../tmp/topology-create-popup-${width}.png` })
    await popup.getByRole('button', { name: 'Đăng ký giám sát', exact: true }).click()
    await expect(
      popup.getByRole('alert').filter({ hasText: 'Tên hoặc địa chỉ này đã được đăng ký.' }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/staff\/monitoring\/topology$/)
    await popup.getByRole('button', { name: 'Đăng ký giám sát', exact: true }).click()
    await expect(popup).toHaveCount(0)
    await expect(page).toHaveURL(/\/staff\/monitoring\/topology$/)
    await expect(
      page.getByRole('button', { name: 'New TCP target, Port Check, UNKNOWN', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Chi tiết target' })).toContainText(
      'New TCP target',
    )
    await expect(
      page.getByRole('status').filter({ hasText: 'Đã tạo target thành công.' }),
    ).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
  })
}
