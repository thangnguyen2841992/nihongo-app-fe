import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import VpsEvents from '../monitor/VpsEvents.vue'
import StaffSidebar from '../StaffSidebar.vue'
import { listVps } from '@/monitor/monitorVpsService'
import {
  getPerformanceMetrics,
  getMetricConfigs,
  getVpsPerformance,
  type VpsPerformance,
} from '@/monitor/vpsPerformanceService'
import { connectVpsPerformance } from '@/monitor/vpsPerformanceRealtime'
import { getEventRules, saveEventRule, type EventRule } from '@/monitor/monitorEventService'

vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: vi.fn().mockResolvedValue({ data: [] }) } }))
vi.mock('@/monitor/monitorVpsService', () => ({ listVps: vi.fn() }))
vi.mock('@/monitor/vpsPerformanceService', () => ({
  getPerformanceMetrics: vi.fn(),
  getMetricConfigs: vi.fn(),
  getVpsPerformance: vi.fn(),
}))
vi.mock('@/monitor/vpsPerformanceRealtime', () => ({ connectVpsPerformance: vi.fn() }))
vi.mock('@/monitor/monitorEventService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/monitor/monitorEventService')>()),
  getEventRules: vi.fn(),
  saveEventRule: vi.fn(),
}))
const path = '/staff/monitoring/vps/events'
let wrapper: ReturnType<typeof mount> | undefined
const stop = vi.fn()
const snapshot = (id = 1, metricCode = 'CPU_USAGE'): VpsPerformance => ({
  vpsId: id,
  metricCode,
  state: 'UP',
  collectionError: null,
  objects: [
    {
      objectKey: `${id}01`,
      objectName: 'CPU 0',
      labels: {},
      status: 'ACTIVE',
      stale: false,
      points: [],
    },
  ],
  events: [],
})
const rule: EventRule = {
  ruleId: 1,
  name: 'CPU cao',
  objectKey: 'all',
  operator: 'GTE',
  threshold: 80,
  severity: 'WARNING',
  consecutiveSamples: 2,
  enabled: true,
  activeObjects: 0,
}
beforeEach(() => {
  vi.clearAllMocks()
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
    ['CPU_USAGE', 'MEMORY_USAGE'].map((code, i) => ({
      metricId: i + 1,
      code,
      name: code,
      unit: '%',
      objectType: i === 0 ? 'CPU' : null,
      scheduleSeconds: 30,
      timeoutMs: 5000,
      enabled: true,
    })),
  )
  vi.mocked(getMetricConfigs).mockResolvedValue(
    ['CPU_USAGE', 'MEMORY_USAGE'].map((code, i) => ({
      assignmentId: i + 1,
      code,
      scheduleSeconds: null,
      effectiveScheduleSeconds: 30,
      enabled: true,
      lastError: null,
      lastSuccessAt: null,
    })),
  )
  vi.mocked(getVpsPerformance).mockImplementation(async (id, code) => snapshot(id, code))
  vi.mocked(connectVpsPerformance).mockReturnValue(stop)
  vi.mocked(getEventRules).mockResolvedValue([])
  vi.mocked(saveEventRule).mockResolvedValue(rule)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})
async function open(query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path, component: VpsEvents },
      { path: '/else', component: { template: '<div />' } },
      { path: '/staff', component: { template: '<div />' } },
    ],
  })
  await router.push(path + query)
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  await flushPromises()
  return router
}
function receive() {
  const calls = vi.mocked(connectVpsPerformance).mock.calls
  return calls[calls.length - 1]![2]
}
it('shows inline configuration and event history on a standalone page and accepts deep links', async () => {
  await open('?vps=2&metric=MEMORY_USAGE')
  expect(wrapper!.get('#event-vps').element).toHaveProperty('value', '2')
  expect(wrapper!.get('#event-metric').element).toHaveProperty('value', 'MEMORY_USAGE')
  expect(wrapper!.find('.event-rules').exists()).toBe(true)
  expect(wrapper!.find('.events').exists()).toBe(true)
  expect(wrapper!.find('dialog').exists()).toBe(false)
  expect(getEventRules).toHaveBeenCalledWith(2, 'MEMORY_USAGE', expect.any(AbortSignal))
  expect(connectVpsPerformance).toHaveBeenLastCalledWith(
    2,
    'MEMORY_USAGE',
    expect.any(Function),
    expect.any(Function),
  )
  wrapper!.unmount()
  wrapper = undefined
  expect(stop).toHaveBeenCalled()
})
it('keeps typed configuration while socket events arrive and reloads DB after reconnect', async () => {
  await open()
  await wrapper!.get('#rule-name').setValue('Chưa lưu')
  const data = snapshot()
  data.events = [
    {
      eventId: 1,
      ruleId: 1,
      ruleName: 'CPU cao',
      objectKey: '101',
      objectName: 'CPU 0',
      kind: 'ALERT',
      severity: 'WARNING',
      operator: 'GTE',
      threshold: 80,
      value: 99,
      timestamp: 1800000000,
      openedEventId: null,
    },
  ]
  receive()(data)
  await flushPromises()
  expect(wrapper!.get('.events').text()).toContain('99 %')
  expect(wrapper!.get('#rule-name').element).toHaveProperty('value', 'Chưa lưu')
  const count = vi.mocked(getVpsPerformance).mock.calls.length
  receive()()
  await flushPromises()
  expect(getVpsPerformance).toHaveBeenCalledTimes(count + 1)
})
it('ignores old HTTP and socket responses after switching VPS/metric', async () => {
  await open()
  let resolve!: (data: VpsPerformance) => void
  vi.mocked(getVpsPerformance).mockImplementation((id, code) =>
    id === 1 && code === 'MEMORY_USAGE'
      ? new Promise((r) => {
          resolve = r
        })
      : Promise.resolve(snapshot(id, code)),
  )
  await wrapper!.get('#event-metric').setValue('MEMORY_USAGE')
  await flushPromises()
  const oldReceive = receive()
  await wrapper!.get('#event-vps').setValue(2)
  await flushPromises()
  resolve(snapshot(1, 'MEMORY_USAGE'))
  oldReceive(snapshot(1, 'MEMORY_USAGE'))
  await flushPromises()
  expect(wrapper!.get('#event-vps').element).toHaveProperty('value', '2')
  expect(getEventRules).toHaveBeenLastCalledWith(2, 'MEMORY_USAGE', expect.any(AbortSignal))
  expect(wrapper!.get('#rule-object').find('option[value="101"]').exists()).toBe(false)
  expect(wrapper!.get('#rule-object').find('option[value="201"]').exists()).toBe(true)
})
it('does not overwrite a newer socket event with a slow snapshot response', async () => {
  await open()
  let resolve!: (data: VpsPerformance) => void
  vi.mocked(getVpsPerformance).mockReturnValueOnce(
    new Promise((r) => {
      resolve = r
    }),
  )
  receive()()
  const data = snapshot()
  data.events = [
    {
      eventId: 2,
      ruleId: 1,
      ruleName: 'Mới nhất',
      objectKey: '101',
      objectName: 'CPU 0',
      kind: 'ALERT',
      severity: 'CRITICAL',
      operator: 'GTE',
      threshold: 80,
      value: 99,
      timestamp: 1800000000,
      openedEventId: null,
    },
  ]
  receive()(data)
  resolve(snapshot())
  await flushPromises()
  expect(wrapper!.get('.events').text()).toContain('Mới nhất')
})
it('blocks selection and navigation while a rule is being saved', async () => {
  const router = await open()
  let resolve!: (rule: EventRule) => void
  vi.mocked(saveEventRule).mockReturnValueOnce(
    new Promise((r) => {
      resolve = r
    }),
  )
  await wrapper!.get('#rule-name').setValue('CPU cao')
  await wrapper!.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper!.get('#event-vps').attributes()).toHaveProperty('disabled')
  expect(wrapper!.get('#event-metric').attributes()).toHaveProperty('disabled')
  await router.push('/else')
  expect(router.currentRoute.value.path).toBe(path)
  resolve(rule)
  await flushPromises()
  expect(wrapper!.get('#event-vps').attributes()).not.toHaveProperty('disabled')
  await router.push('/else')
  expect(router.currentRoute.value.path).toBe('/else')
})
it('shows empty states without creating a subscription when VPS/assignments are missing', async () => {
  vi.mocked(listVps).mockResolvedValue([])
  await open()
  expect(wrapper!.text()).toContain('Chưa có VPS')
  expect(connectVpsPerformance).not.toHaveBeenCalled()
  wrapper!.unmount()
  wrapper = undefined
  vi.mocked(listVps).mockResolvedValue([
    {
      vpsId: 1,
      hostname: 'host',
      ipAddress: '10.0.0.1',
      agentPort: 9100,
      osType: '',
      osVersion: '',
      architecture: '',
      status: 'UP',
      lastSeenAt: '',
    },
  ])
  vi.mocked(getMetricConfigs).mockResolvedValue([])
  await open()
  expect(wrapper!.text()).toContain('chưa được gán metric')
  expect(connectVpsPerformance).not.toHaveBeenCalled()
})
it('offers retry after a snapshot error', async () => {
  vi.mocked(getVpsPerformance).mockRejectedValueOnce(new Error('offline'))
  await open()
  expect(wrapper!.get('[role=alert]').text()).toContain('Không tải được')
  await wrapper!.get('[role=alert] button').trigger('click')
  await flushPromises()
  expect(wrapper!.find('[role=alert]').exists()).toBe(false)
  expect(wrapper!.find('.event-rules').exists()).toBe(true)
})
it('navigates to the event page from the sidebar and highlights the menu', async () => {
  const router = await open()
  wrapper!.unmount()
  wrapper = undefined
  await router.push('/staff')
  wrapper = mount(StaffSidebar, { global: { plugins: [router] } })
  await flushPromises()
  await wrapper
    .findAll('button')
    .find((b) => b.text().includes('Monitoring Server'))!
    .trigger('click')
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Event VPS')!
    .trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe(path)
  expect(
    wrapper
      .findAll('button')
      .find((b) => b.text() === 'Event VPS')!
      .classes(),
  ).toContain('active')
})
