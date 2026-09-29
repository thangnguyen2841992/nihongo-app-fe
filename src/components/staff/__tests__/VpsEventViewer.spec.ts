import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import VpsEventViewer from '../monitor/VpsEventViewer.vue'
import StaffSidebar from '../StaffSidebar.vue'
import { listVps } from '@/monitor/monitorVpsService'
import { getPerformanceMetrics } from '@/monitor/vpsPerformanceService'
import { getVpsEvents, type MonitorEvent, type VpsEventPage } from '@/monitor/monitorEventService'
import { connectVpsEvents } from '@/monitor/vpsEventRealtime'
vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: vi.fn().mockResolvedValue({ data: [] }) } }))
vi.mock('@/monitor/monitorVpsService', () => ({ listVps: vi.fn() }))
vi.mock('@/monitor/vpsPerformanceService', () => ({ getPerformanceMetrics: vi.fn() }))
vi.mock('@/monitor/vpsEventRealtime', () => ({ connectVpsEvents: vi.fn() }))
vi.mock('@/monitor/monitorEventService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/monitor/monitorEventService')>()),
  getVpsEvents: vi.fn(),
}))
let wrapper: ReturnType<typeof mount> | undefined
const stop = vi.fn(),
  base = '/staff/monitoring/vps/events'
function event(id: number, metric = 'MEMORY_USAGE'): MonitorEvent {
  return {
    eventId: id,
    ruleId: 1,
    ruleName: `Rule ${id}`,
    objectKey: 'vps',
    objectName: 'VPS',
    kind: 'ALERT',
    severity: 'WARNING',
    operator: 'GTE',
    threshold: 80,
    value: 95,
    timestamp: 1800000000 + id,
    openedEventId: null,
    metricId: 1,
    metricCode: metric,
    metricName: metric,
    unit: '%',
  }
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listVps).mockResolvedValue(
    [1, 2].map((id) => ({
      vpsId: id,
      hostname: `host-${id}`,
      ipAddress: `10.0.0.${id}`,
      agentPort: 9100,
      osType: 'Linux',
      osVersion: '24',
      architecture: 'amd64',
      status: 'UP',
      lastSeenAt: '',
    })),
  )
  vi.mocked(getPerformanceMetrics).mockResolvedValue(
    ['MEMORY_USAGE', 'DISK_USAGE'].map((code, i) => ({
      metricId: i + 1,
      code,
      name: code,
      unit: '%',
      objectType: null,
      scheduleSeconds: 30,
      timeoutMs: 5000,
      enabled: true,
    })),
  )
  vi.mocked(getVpsEvents).mockResolvedValue({ events: [], nextCursor: null })
  vi.mocked(connectVpsEvents).mockReturnValue(stop)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})
async function open(mode = 'realtime', query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: base + '/realtime', component: VpsEventViewer, props: { realtime: true } },
      { path: base + '/history', component: VpsEventViewer, props: { realtime: false } },
    ],
  })
  await router.push(base + '/' + mode + query)
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  await flushPromises()
  return router
}
it('merges a DB snapshot with arriving socket events, deduplicates and filters metrics', async () => {
  let resolve!: (page: VpsEventPage) => void
  vi.mocked(getVpsEvents).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  await open()
  const receive = vi.mocked(connectVpsEvents).mock.calls[0]![1]
  receive([event(2, 'DISK_USAGE'), event(1)])
  resolve({ events: [event(1)], nextCursor: null })
  await flushPromises()
  expect(wrapper!.findAll('tbody tr')).toHaveLength(2)
  expect(wrapper!.findAll('tbody tr')[0]!.text()).toContain('Rule 2')
  await wrapper!.get('#event-view-metric').setValue('MEMORY_USAGE')
  expect(wrapper!.findAll('tbody tr')).toHaveLength(1)
  receive([event(1), event(3)])
  await flushPromises()
  expect(wrapper!.findAll('tbody tr')).toHaveLength(2)
  receive()
  await flushPromises()
  expect(getVpsEvents).toHaveBeenCalledTimes(2)
})
it('discards previous VPS responses and socket frames after changing selection', async () => {
  let resolve!: (page: VpsEventPage) => void
  vi.mocked(getVpsEvents).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  await open()
  const receive = vi.mocked(connectVpsEvents).mock.calls[0]![1]
  const signal = vi.mocked(getVpsEvents).mock.calls[0]![2]
  await wrapper!.get('#event-view-vps').setValue(2)
  await flushPromises()
  expect(stop).toHaveBeenCalledOnce()
  expect(signal!.aborted).toBe(true)
  receive([event(9)])
  resolve({ events: [event(8)], nextCursor: null })
  await flushPromises()
  expect(wrapper!.findAll('tbody tr')).toHaveLength(0)
  vi.mocked(connectVpsEvents).mock.calls[1]![1]([event(10)])
  await flushPromises()
  expect(wrapper!.text()).toContain('Rule 10')
  expect(wrapper!.text()).not.toContain('Rule 9')
})
it('queries history with UTC dates and retains applied filters during pagination', async () => {
  vi.mocked(getVpsEvents)
    .mockResolvedValueOnce({ events: [event(2)], nextCursor: 2 })
    .mockResolvedValueOnce({ events: [event(1)], nextCursor: null })
  await open('history', '?vps=2')
  expect(connectVpsEvents).not.toHaveBeenCalled()
  expect(getVpsEvents).not.toHaveBeenCalled()
  await wrapper!.get('#event-from').setValue('2026-09-29T08:00:00')
  await wrapper!.get('#event-to').setValue('2026-09-29T09:00:00')
  await wrapper!.get('#event-view-metric').setValue('MEMORY_USAGE')
  await wrapper!.get('#event-view-severity').setValue('FATAL')
  await wrapper!.get('form').trigger('submit')
  await flushPromises()
  const query = {
    from: new Date('2026-09-29T08:00:00').toISOString(),
    to: new Date('2026-09-29T09:00:00').toISOString(),
    metric: 'MEMORY_USAGE',
    severity: 'FATAL',
  }
  expect(getVpsEvents).toHaveBeenCalledWith(2, query, expect.any(AbortSignal))
  await wrapper!.get('#event-view-metric').setValue('DISK_USAGE')
  await wrapper!.get('#event-from').setValue('2026-09-28T08:00:00')
  await wrapper!
    .findAll('button')
    .find((b) => b.text() === 'Xem thêm event')!
    .trigger('click')
  await flushPromises()
  expect(getVpsEvents).toHaveBeenLastCalledWith(
    2,
    { ...query, beforeId: 2 },
    expect.any(AbortSignal),
  )
  expect(wrapper!.findAll('tbody tr')).toHaveLength(2)
})
it('rejects an inverted interval and displays request failures', async () => {
  await open('history')
  await wrapper!.get('#event-from').setValue('2026-09-29T09:00:00')
  await wrapper!.get('#event-to').setValue('2026-09-29T08:00:00')
  await wrapper!.get('form').trigger('submit')
  await flushPromises()
  expect(getVpsEvents).not.toHaveBeenCalled()
  expect(wrapper!.get('[role=alert]').text()).toContain('bắt đầu không được sau kết thúc')
  vi.mocked(getVpsEvents).mockRejectedValueOnce(new Error('network'))
  await wrapper!.get('#event-to').setValue('2026-09-29T10:00:00')
  await wrapper!.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper!.get('[role=alert]').text()).toContain('Không tải được event')
})
it('caps realtime buffer and disconnects when navigating to history', async () => {
  const router = await open()
  const receive = vi.mocked(connectVpsEvents).mock.calls[0]![1]
  receive(Array.from({ length: 205 }, (_, i) => event(i + 1)))
  await flushPromises()
  expect(wrapper!.findAll('tbody tr')).toHaveLength(200)
  await router.push(base + '/history?vps=1')
  await flushPromises()
  expect(stop).toHaveBeenCalledOnce()
  expect(wrapper!.text()).toContain('Lịch sử event')
  receive([event(300)])
  await flushPromises()
  expect(wrapper!.findAll('tbody tr')).toHaveLength(0)
})
it('opens both screens from the sidebar with only the selected menu active', async () => {
  const router = await open()
  wrapper!.unmount()
  wrapper = mount(StaffSidebar, { global: { plugins: [router] } })
  await flushPromises()
  for (const [label, mode] of [
    ['Event realtime', 'realtime'],
    ['Lịch sử event', 'history'],
  ]) {
    const button = wrapper.findAll('button').find((b) => b.text() === label)!
    await button.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(base + '/' + mode)
    expect(button.classes()).toContain('active')
    const other = wrapper
      .findAll('button')
      .find((b) => b.text() === (mode === 'realtime' ? 'Lịch sử event' : 'Event realtime'))!
    expect(other.classes()).not.toContain('active')
  }
})
