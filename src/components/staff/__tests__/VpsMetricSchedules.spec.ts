import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import VpsMetricSchedules from '../monitor/VpsMetricSchedules.vue'
import { listVps } from '@/monitor/monitorVpsService'
import {
  getPerformanceMetrics,
  getMetricConfigs,
  updateVpsMetricConfig,
  updateDefaultMetricConfig,
} from '@/monitor/vpsPerformanceService'
vi.mock('@/monitor/monitorVpsService', () => ({ listVps: vi.fn() }))
vi.mock('@/monitor/vpsPerformanceService', () => ({
  getPerformanceMetrics: vi.fn(),
  getMetricConfigs: vi.fn(),
  updateVpsMetricConfig: vi.fn(),
  updateDefaultMetricConfig: vi.fn(),
}))
let wrapper: ReturnType<typeof mount> | undefined
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listVps).mockResolvedValue([
    {
      vpsId: 1,
      hostname: 'host',
      ipAddress: '127.0.0.1',
      agentPort: 9100,
      status: 'UP',
      osType: 'Linux',
      osVersion: '',
      architecture: '',
      lastSeenAt: '',
    },
  ])
  vi.mocked(getPerformanceMetrics).mockResolvedValue([
    {
      metricId: 1,
      code: 'CPU_USAGE',
      name: 'CPU',
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
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})
async function open() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/schedules', component: VpsMetricSchedules }],
  })
  await router.push('/schedules?vps=1')
  wrapper = mount(VpsMetricSchedules, { global: { plugins: [router] } })
  await flushPromises()
}
it('saves a VPS override and restores inheritance with null', async () => {
  await open()
  await wrapper!.findAll('.check input')[0]!.setValue(false)
  await wrapper!.get('#seconds-CPU_USAGE').setValue(120)
  await wrapper!.get('.primary').trigger('click')
  await flushPromises()
  expect(updateVpsMetricConfig).toHaveBeenCalledWith(1, 'CPU_USAGE', {
    scheduleSeconds: 120,
    enabled: true,
  })
  await wrapper!.findAll('.check input')[0]!.setValue(true)
  await wrapper!.get('.primary').trigger('click')
  await flushPromises()
  expect(updateVpsMetricConfig).toHaveBeenLastCalledWith(1, 'CPU_USAGE', {
    scheduleSeconds: null,
    enabled: true,
  })
})
it('configures the global metric schedule and timeout separately', async () => {
  await open()
  await wrapper!.get('#schedule-scope').setValue('default')
  await flushPromises()
  await wrapper!.get('#seconds-CPU_USAGE').setValue(90)
  await wrapper!.get('#timeout-CPU_USAGE').setValue(6000)
  await wrapper!.get('.primary').trigger('click')
  await flushPromises()
  expect(updateDefaultMetricConfig).toHaveBeenCalledWith(1, {
    scheduleSeconds: 90,
    timeoutMs: 6000,
    enabled: true,
  })
  expect(wrapper!.text()).toContain('Đã lưu')
})
it('validates schedules and displays failed saves', async () => {
  await open()
  await wrapper!.findAll('.check input')[0]!.setValue(false)
  await wrapper!.get('#seconds-CPU_USAGE').setValue(1)
  await wrapper!.get('.primary').trigger('click')
  expect(updateVpsMetricConfig).not.toHaveBeenCalled()
  expect(wrapper!.get('[role="alert"]').text()).toContain('5 đến 86400')
  await wrapper!.get('#seconds-CPU_USAGE').setValue(60)
  vi.mocked(updateVpsMetricConfig).mockRejectedValue(new Error('network'))
  await wrapper!.get('.primary').trigger('click')
  await flushPromises()
  expect(wrapper!.get('[role="alert"]').text()).toContain('Vui lòng thử lại')
})
