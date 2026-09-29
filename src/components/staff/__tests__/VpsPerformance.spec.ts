import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import VpsPerformance from '../monitor/VpsPerformance.vue'
import { listVps } from '@/monitor/monitorVpsService'
import {
  getPerformanceMetrics,
  getVpsPerformance,
  getMetricConfigs,
  updateVpsMetricConfig,
  type VpsPerformance as PerformanceData,
} from '@/monitor/vpsPerformanceService'

import { connectVpsPerformance } from '@/monitor/vpsPerformanceRealtime'
import { Chart } from 'chart.js'
vi.mock('@/monitor/vpsPerformanceRealtime', () => ({ connectVpsPerformance: vi.fn(() => vi.fn()) }))

vi.mock('@/monitor/monitorVpsService', () => ({ listVps: vi.fn() }))
vi.mock('@/monitor/vpsPerformanceService', () => ({
  getPerformanceMetrics: vi.fn(),
  getVpsPerformance: vi.fn(),
  getMetricConfigs: vi.fn(),
  updateVpsMetricConfig: vi.fn(),
  updateDefaultMetricConfig: vi.fn(),
}))
vi.mock('chart.js', () => ({
  Chart: Object.assign(
    vi.fn(function () {
      return { destroy: vi.fn() }
    }),
    { register: vi.fn() },
  ),
  registerables: [],
}))
let wrapper: ReturnType<typeof mount> | undefined
const result = (id = 1): PerformanceData => ({
  vpsId: id,
  metricCode: 'CPU_USAGE',
  state: 'UP',
  collectionError: null,
  objects: [
    {
      objectKey: `${id}01`,
      objectName: 'CPU 0',
      labels: { cpu: '0' },
      status: 'ACTIVE',
      stale: false,
      points: [{ timestamp: 1800000000, value: 25 }],
    },
    {
      objectKey: `${id}02`,
      objectName: 'CPU 1',
      labels: { cpu: '1' },
      status: 'ACTIVE',
      stale: false,
      points: [],
    },
  ],
})
beforeEach(() => {
  vi.resetAllMocks()
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
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
  vi.mocked(getPerformanceMetrics).mockResolvedValue([
    {
      metricId: 1,
      code: 'CPU_USAGE',
      name: 'CPU usage',
      unit: '%',
      objectType: 'CPU',
      scheduleSeconds: 30,
      timeoutMs: 5000,
      enabled: true,
    },
  ])
  vi.mocked(getMetricConfigs).mockResolvedValue([
    {
      assignmentId: 1,
      code: 'CPU_USAGE',
      scheduleSeconds: null,
      effectiveScheduleSeconds: 30,
      enabled: true,
      lastError: null,
      lastSuccessAt: null,
    },
  ])
  vi.mocked(getVpsPerformance).mockImplementation(async (id) => result(id))
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})
async function open(query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/perf', component: VpsPerformance }],
  })
  await router.push('/perf' + query)
  wrapper = mount(VpsPerformance, { global: { plugins: [router] } })
  await flushPromises()
}
it('shows each object separately and requests history for the selected object', async () => {
  await open('?vps=2')
  expect(wrapper!.findAll('.object-row')).toHaveLength(2)
  expect(wrapper!.get('.object-list').text()).toContain('Chưa có dữ liệu')
  await wrapper!.findAll('.object-row')[1]!.trigger('click')
  await flushPromises()
  expect(getVpsPerformance).toHaveBeenLastCalledWith(
    2,
    'CPU_USAGE',
    expect.any(AbortSignal),
    undefined,
    '202',
    10,
  )
})
it('updates values from socket frames without polling HTTP and closes old subscriptions', async () => {
  await open()
  const calls = vi.mocked(connectVpsPerformance).mock.calls
  const update = calls[calls.length - 1]![2]
  const status = calls[calls.length - 1]![3]
  const count = vi.mocked(getVpsPerformance).mock.calls.length
  const data = result()
  data.objects[0]!.points = [{ timestamp: Date.now() / 1000, value: 79 }]
  status('live')
  update(data)
  await flushPromises()
  expect(wrapper!.get('.object-list').text()).toContain('79')
  expect(wrapper!.text()).toContain('Đang nhận trực tiếp')
  expect(getVpsPerformance).toHaveBeenCalledTimes(count)
  const results = vi.mocked(connectVpsPerformance).mock.results
  const stop = results[results.length - 1]!.value
  await wrapper!.get('#perf-vps').setValue(2)
  await flushPromises()
  expect(stop).toHaveBeenCalled()
  update(data)
  await flushPromises()
  expect(wrapper!.get('.object-list').text()).not.toContain('79')
})
it('resyncs the selected snapshot after reconnect', async () => {
  await open()
  const calls = vi.mocked(connectVpsPerformance).mock.calls
  const call = calls[calls.length - 1]!
  vi.mocked(getVpsPerformance).mockClear()
  call[2]()
  await flushPromises()
  expect(getVpsPerformance).toHaveBeenCalled()
})
it('loads ten minutes from DB and appends socket points without replacing the history', async () => {
  const now = Math.floor(Date.now() / 1000)
  vi.mocked(getVpsPerformance).mockImplementation(
    async (id, _metric, _signal, _hours, key, minutes) => {
      const data = result(id)
      if (minutes === 10 && key)
        data.objects = [
          {
            ...data.objects[0]!,
            points: [
              { timestamp: now - 650, value: 99 },
              { timestamp: now - 90, value: 25 },
              { timestamp: now - 30, value: 40 },
            ],
          },
        ]
      return data
    },
  )
  await open()
  expect(wrapper!.get('#perf-hours').element).toHaveProperty('value', '10')
  expect(getVpsPerformance).toHaveBeenCalledWith(
    1,
    'CPU_USAGE',
    expect.any(AbortSignal),
    undefined,
    '101',
    10,
  )
  const initialCalls = vi.mocked(Chart).mock.calls
  expect(initialCalls[initialCalls.length - 1]![1]!.data.datasets[0]!.data).toEqual([25, 40])
  const count = vi.mocked(getVpsPerformance).mock.calls.length
  const calls = vi.mocked(connectVpsPerformance).mock.calls
  const data = result()
  data.objects[0]!.points = [{ timestamp: now, value: 79 }]
  calls[calls.length - 1]![2](data)
  await flushPromises()
  const updatedCalls = vi.mocked(Chart).mock.calls
  expect(updatedCalls[updatedCalls.length - 1]![1]!.data.datasets[0]!.data).toEqual([25, 40, 79])
  expect(wrapper!.get('.object-list').text()).toContain('79')
  expect(getVpsPerformance).toHaveBeenCalledTimes(count)
})
it('keeps socket data that arrives while DB history is still loading', async () => {
  const now = Math.floor(Date.now() / 1000)
  let resolveHistory!: (data: PerformanceData) => void
  vi.mocked(getVpsPerformance).mockImplementation(
    async (id, _metric, _signal, _hours, _key, minutes) =>
      minutes
        ? new Promise((resolve) => {
            resolveHistory = resolve
          })
        : result(id),
  )
  await open()
  const calls = vi.mocked(connectVpsPerformance).mock.calls
  const data = result()
  data.objects[0]!.points = [{ timestamp: now, value: 79 }]
  calls[calls.length - 1]![2](data)
  const baseline = result()
  baseline.objects = [{ ...baseline.objects[0]!, points: [{ timestamp: now - 60, value: 25 }] }]
  resolveHistory(baseline)
  await flushPromises()
  const chartCalls = vi.mocked(Chart).mock.calls
  expect(chartCalls[chartCalls.length - 1]![1]!.data.datasets[0]!.data).toEqual([25, 79])
  expect(wrapper!.get('.object-list').text()).toContain('79')
})
it('does not let a late response from the previous VPS overwrite the selected VPS', async () => {
  let resolveOld!: (value: PerformanceData) => void
  vi.mocked(getVpsPerformance)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        }),
    )
    .mockImplementation(async (id) => result(id))
  await open()
  await wrapper!.get('#perf-vps').setValue(2)
  await flushPromises()
  resolveOld(result(1))
  await flushPromises()
  expect(wrapper!.get('#perf-vps').element).toHaveProperty('value', '2')
  expect(wrapper!.findAll('.object-row')[0]!.attributes('aria-pressed')).toBe('true')
  expect(getVpsPerformance).toHaveBeenLastCalledWith(
    2,
    'CPU_USAGE',
    expect.any(AbortSignal),
    undefined,
    '201',
    10,
  )
})
it('shows collector errors and identifies stale values without replacing them with zero', async () => {
  const data = result()
  data.collectionError = 'Node Exporter timeout'
  data.state = 'DOWN'
  data.objects[0]!.stale = true
  vi.mocked(getVpsPerformance).mockResolvedValue(data)
  await open()
  expect(wrapper!.get('[role="alert"]').text()).toContain('Node Exporter timeout')
  expect(wrapper!.get('.object-list').text()).toContain('Giá trị đã cũ')
  expect(wrapper!.get('.object-list').text()).toContain('25')
})
it('shows an empty state when no VPS is registered', async () => {
  vi.mocked(listVps).mockResolvedValue([])
  await open()
  expect(wrapper!.text()).toContain('Chưa có VPS nào')
  expect(getVpsPerformance).not.toHaveBeenCalled()
})
it('edits schedules in a popup for the selected VPS without leaving the performance screen', async () => {
  await open('?vps=2')
  const overflow = document.body.style.overflow
  await wrapper!.get('button[aria-haspopup="dialog"]').trigger('click')
  await flushPromises()
  expect(wrapper!.get('.schedule-dialog').attributes()).toHaveProperty('open')
  expect(document.body.style.overflow).toBe('hidden')
  expect(wrapper!.get('#schedule-vps').element).toHaveProperty('value', '2')
  expect(wrapper!.get('#schedule-metric').element).toHaveProperty('value', 'CPU_USAGE')
  await wrapper!.get('.schedule-dialog .check input').setValue(false)
  await wrapper!.get('#seconds-CPU_USAGE').setValue(120)
  const count = vi.mocked(getVpsPerformance).mock.calls.length
  await wrapper!.get('.schedule-dialog .primary').trigger('click')
  await flushPromises()
  expect(updateVpsMetricConfig).toHaveBeenCalledWith(2, 'CPU_USAGE', {
    scheduleSeconds: 120,
    enabled: true,
  })
  expect(wrapper!.get('.schedule-dialog').text()).toContain('Đã lưu')
  expect(getVpsPerformance).toHaveBeenCalledTimes(count)
  await wrapper!.get('.dialog-close').trigger('click')
  await flushPromises()
  expect(wrapper!.find('.schedule-dialog').exists()).toBe(false)
  expect(document.body.style.overflow).toBe(overflow)
  expect(wrapper!.findAll('.object-row')).toHaveLength(2)
})
it('opens from the schedule shortcut and closes with Escape', async () => {
  await open('?schedules=1')
  expect(wrapper!.get('.schedule-dialog').attributes()).toHaveProperty('open')
  await wrapper!.get('.schedule-dialog').trigger('cancel')
  await flushPromises()
  expect(wrapper!.find('.schedule-dialog').exists()).toBe(false)
  expect(document.body.style.overflow).not.toBe('hidden')
})
