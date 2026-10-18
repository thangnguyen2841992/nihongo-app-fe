import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import MonitoringTopology from '../monitor/MonitoringTopology.vue'
import { listVps, type MonitorVps } from '@/monitor/monitorVpsService'
import { targetKind, topologyLayout } from '@/monitor/topology'

vi.mock('@/monitor/monitorVpsService', () => ({ listVps: vi.fn() }))
const target = (
  id: number,
  exporterType: MonitorVps['exporterType'],
  status = 'UP',
): MonitorVps => ({
  vpsId: id,
  hostname: `target-${id}`,
  ipAddress: `10.0.0.${id}`,
  agentPort: 80,
  exporterType,
  osType: 'Linux',
  osVersion: '',
  architecture: '',
  status,
  lastSeenAt: '2026-10-17T10:00:00',
})
const rows = [
  target(1, 'NODE_EXPORTER'),
  target(2, 'WINDOWS_EXPORTER'),
  target(3, 'MYSQL_JDBC', 'DOWN'),
  target(4, 'KAFKA_ADMIN'),
  target(5, 'PORT_CHECK', 'UNKNOWN'),
  target(6, 'WEB_CHECK'),
]
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listVps).mockResolvedValue(rows)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
  vi.useRealTimers()
})
async function open() {
  wrapper = mount(MonitoringTopology, {
    global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
  await flushPromises()
}
it('renders all six target icons, statuses and correct detail links', async () => {
  await open()
  expect(wrapper!.findAll('.target-node')).toHaveLength(6)
  expect(wrapper!.findAll('.target-icon').map((icon) => icon.classes().join(' '))).toEqual(
    expect.arrayContaining([
      'bi target-icon bi-hdd-rack',
      'bi target-icon bi-windows',
      'bi target-icon bi-database',
      'bi target-icon bi-diagram-3',
      'bi target-icon bi-plug',
      'bi target-icon bi-globe2',
    ]),
  )
  await wrapper!.get('[data-target-id="3"]').trigger('click')
  const detail = wrapper!.get('.target-detail')
  expect(detail.text()).toContain('DOWN')
  expect(detail.findAll('a').map((link) => link.attributes('href'))).toEqual([
    '/staff/monitoring/vps/performance?vps=3',
    '/staff/monitoring/vps/events?vps=3',
  ])
  await detail.get('button').trigger('click')
  expect(wrapper!.find('.target-detail').exists()).toBe(false)
})
it('filters by name, address, target type and status without a new request', async () => {
  await open()
  await wrapper!.get('[data-type="MYSQL_JDBC"]').trigger('click')
  expect(wrapper!.findAll('.target-node')).toHaveLength(1)
  await wrapper!.get('select').setValue('UP')
  expect(wrapper!.text()).toContain('Không có target phù hợp')
  await wrapper!.get('.tree-all').trigger('click')
  await wrapper!.get('select').setValue('')
  await wrapper!.get('input').setValue('10.0.0.6')
  expect(wrapper!.get('.target-node').attributes('data-target-id')).toBe('6')
  expect(listVps).toHaveBeenCalledTimes(1)
})
it('expands Type branches and locates a target from the tree menu', async () => {
  await open()
  const branch = wrapper!.get('[aria-label="Mở rộng MySQL"]')
  await branch.trigger('click')
  expect(wrapper!.get('[aria-label="Thu gọn MySQL"]').attributes('aria-expanded')).toBe('true')
  await wrapper!.get('#type-children-MYSQL_JDBC button').trigger('click')
  await flushPromises()
  expect(wrapper!.findAll('.target-node')).toHaveLength(1)
  expect(wrapper!.get('.target-detail h2').text()).toBe('target-3')
  await wrapper!.get('[aria-label="Thu gọn MySQL"]').trigger('click')
  expect(wrapper!.get('[aria-label="Mở rộng MySQL"]').attributes('aria-expanded')).toBe('false')
  expect(listVps).toHaveBeenCalledTimes(1)
})
it('updates statuses without clearing a selected target or its map position', async () => {
  await open()
  await wrapper!.get('[data-target-id="1"]').trigger('click')
  vi.mocked(listVps).mockResolvedValueOnce(rows.map((row) => ({ ...row, status: 'DOWN' })))
  await wrapper!.get('.filters>button').trigger('click')
  await flushPromises()
  expect(wrapper!.get('.target-detail').text()).toContain('DOWN')
  expect(wrapper!.get('[data-target-id="1"]').classes()).toContain('selected')
  vi.mocked(listVps).mockRejectedValueOnce(new Error('offline'))
  await wrapper!.get('.filters>button').trigger('click')
  await flushPromises()
  expect(wrapper!.get('[role="alert"]').text()).toContain('giữ dữ liệu lần cập nhật trước')
  expect(wrapper!.findAll('.target-node')).toHaveLength(6)
})
it('pauses refresh while hidden, coalesces requests and cancels on unmount', async () => {
  vi.useFakeTimers()
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  await open()
  await vi.advanceTimersByTimeAsync(30000)
  expect(listVps).toHaveBeenCalledTimes(2)
  hidden.mockReturnValue(true)
  await vi.advanceTimersByTimeAsync(60000)
  expect(listVps).toHaveBeenCalledTimes(2)
  hidden.mockReturnValue(false)
  vi.mocked(listVps).mockImplementationOnce(() => new Promise(() => {}))
  document.dispatchEvent(new Event('visibilitychange'))
  window.dispatchEvent(new Event('focus'))
  expect(listVps).toHaveBeenCalledTimes(3)
  const signal = vi.mocked(listVps).mock.calls[2]![0]!
  wrapper!.unmount()
  wrapper = undefined
  expect(signal.aborted).toBe(true)
  await vi.advanceTimersByTimeAsync(60000)
  window.dispatchEvent(new Event('focus'))
  expect(listVps).toHaveBeenCalledTimes(3)
})
it('shows empty targets and supports retry after the initial load fails', async () => {
  vi.mocked(listVps).mockRejectedValueOnce(new Error('offline'))
  await open()
  expect(wrapper!.get('[role="alert"]').text()).toContain('Chưa tải được')
  vi.mocked(listVps).mockResolvedValueOnce([])
  await wrapper!.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper!.text()).toContain('Chưa có target để hiển thị')
})
it('opens the map menu and closes it on Escape, outside click and arranging', async () => {
  await open()
  const map = wrapper!.get('.map-viewport')
  await map.trigger('contextmenu', { clientX: 200, clientY: 100 })
  expect(wrapper!.get('[role="menuitem"]').text()).toContain('Sắp xếp tự động')
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  await flushPromises()
  expect(wrapper!.find('[role="menu"]').exists()).toBe(false)
  await map.trigger('contextmenu', { clientX: 200, clientY: 100 })
  document.dispatchEvent(new Event('pointerdown'))
  await flushPromises()
  expect(wrapper!.find('[role="menu"]').exists()).toBe(false)
  await map.trigger('keydown', { key: 'F10', shiftKey: true })
  await flushPromises()
  await wrapper!.get('[role="menuitem"]').trigger('click')
  expect(wrapper!.find('[role="menu"]').exists()).toBe(false)
  expect(wrapper!.findAll('.target-node')).toHaveLength(6)
  expect(listVps).toHaveBeenCalledTimes(1)
})
it('lays out stable non-overlapping nodes, retains dragged positions and handles legacy types', () => {
  const positions = new Map([[1, { x: 300, y: 900 }]])
  const graph = topologyLayout([...rows, target(7, 'NODE_EXPORTER')], positions)
  expect(graph.nodes.find((node) => node.target.vpsId === 1)).toMatchObject({ x: 300, y: 900 })
  expect(graph.height).toBeGreaterThan(900)
  const unrestricted = topologyLayout(rows, new Map([[1, { x: -800, y: -400 }]]))
  expect(unrestricted.nodes.find((node) => node.target.vpsId === 1)).toMatchObject({
    x: -800,
    y: -400,
  })
  expect(unrestricted.minX).toBeLessThan(-800)
  expect(unrestricted.minY).toBeLessThan(-400)
  expect(
    graph.nodes
      .filter((node) => node.group.key === 'NODE_EXPORTER')
      .map((node) => node.target.vpsId),
  ).toEqual([1, 7])
  expect(targetKind({ ...rows[0]!, exporterType: undefined, osType: 'Windows Server' }).key).toBe(
    'WINDOWS_EXPORTER',
  )
  expect(
    targetKind({ ...rows[0]!, exporterType: 'FUTURE_TYPE' as MonitorVps['exporterType'] }).key,
  ).toBe('OTHER')
})
