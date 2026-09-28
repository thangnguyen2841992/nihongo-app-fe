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
    1,
    '202',
  )
})
it('saves the schedule override and restores the default with null', async () => {
  await open()
  await wrapper!.get('.config-actions input').setValue(false)
  await wrapper!.get('#config-seconds').setValue(120)
  await wrapper!.get('.config-actions button').trigger('click')
  await flushPromises()
  expect(updateVpsMetricConfig).toHaveBeenCalledWith(1, 'CPU_USAGE', {
    scheduleSeconds: 120,
    enabled: true,
  })
  await wrapper!.get('.config-actions input').setValue(true)
  await wrapper!.get('.config-actions button').trigger('click')
  await flushPromises()
  expect(updateVpsMetricConfig).toHaveBeenLastCalledWith(1, 'CPU_USAGE', {
    scheduleSeconds: null,
    enabled: true,
  })
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
    1,
    '201',
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
