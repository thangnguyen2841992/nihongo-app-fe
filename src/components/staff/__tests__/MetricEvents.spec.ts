import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MetricEventRules from '../monitor/MetricEventRules.vue'
import VpsEventHistory from '../monitor/VpsEventHistory.vue'
import {
  getEventRules,
  saveEventRule,
  deleteEventRule,
  getMonitorEvents,
  type EventRule,
  type MonitorEvent,
} from '@/monitor/monitorEventService'

vi.mock('@/monitor/monitorEventService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/monitor/monitorEventService')>()),
  getEventRules: vi.fn(),
  saveEventRule: vi.fn(),
  deleteEventRule: vi.fn(),
  getMonitorEvents: vi.fn(),
}))
let wrapper: ReturnType<typeof mount> | undefined
const rule = (): EventRule => ({
  ruleId: 1,
  name: 'CPU quá tải',
  objectKey: 'all',
  operator: 'GTE',
  threshold: 80,
  severity: 'WARNING',
  consecutiveSamples: 2,
  enabled: true,
  activeObjects: 0,
})
const event = (id: number): MonitorEvent => ({
  eventId: id,
  ruleId: 1,
  ruleName: 'CPU quá tải',
  objectKey: '10',
  objectName: 'CPU 0',
  kind: 'ALERT',
  severity: 'WARNING',
  operator: 'GTE',
  threshold: 80,
  value: 95,
  timestamp: 1800000000,
  openedEventId: null,
})
const props = {
  vpsId: 2,
  metricCode: 'CPU_USAGE',
  metricName: 'CPU usage',
  unit: '%',
  objects: [
    {
      objectKey: '10',
      objectName: 'CPU 0',
      labels: {},
      status: 'ACTIVE',
      stale: false,
      points: [],
    },
  ],
}
beforeEach(() => {
  vi.clearAllMocks()
  document.body.style.overflow = 'auto'
  vi.mocked(getEventRules).mockResolvedValue([])
  vi.mocked(saveEventRule).mockResolvedValue(rule())
  vi.mocked(deleteEventRule).mockResolvedValue({} as any)
  vi.mocked(getMonitorEvents).mockResolvedValue([])
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.style.overflow = ''
})
async function open() {
  wrapper = mount(MetricEventRules, { props })
  await flushPromises()
  return wrapper
}
it('creates all-object rules inline without changing body scrolling', async () => {
  const view = await open()
  expect(getEventRules).toHaveBeenCalledWith(2, 'CPU_USAGE', expect.any(AbortSignal))
  expect(document.body.style.overflow).toBe('auto')
  expect(view.find('dialog').exists()).toBe(false)
  await view.get('#rule-name').setValue('CPU quá tải')
  await view.get('form').trigger('submit')
  await flushPromises()
  expect(saveEventRule).toHaveBeenCalledWith(
    2,
    'CPU_USAGE',
    {
      name: 'CPU quá tải',
      objectKey: 'all',
      operator: 'GTE',
      threshold: 80,
      severity: 'WARNING',
      consecutiveSamples: 2,
      enabled: true,
    },
    undefined,
  )
  expect(view.emitted('saved')).toHaveLength(1)
  expect(view.text()).toContain('Đã lưu rule')
  view.unmount()
  wrapper = undefined
  expect(document.body.style.overflow).toBe('auto')
})
it('offers exactly Minor, Warning, Critical, Fatal and saves a Fatal rule', async () => {
  const view = await open()
  expect(
    view
      .get('#rule-severity')
      .findAll('option')
      .map((option) => option.text()),
  ).toEqual(['Minor', 'Warning', 'Critical', 'Fatal'])
  await view.get('#rule-name').setValue('CPU quá tải nghiêm trọng')
  await view.get('#rule-severity').setValue('FATAL')
  vi.mocked(saveEventRule).mockResolvedValue({ ...rule(), severity: 'FATAL' })
  await view.get('form').trigger('submit')
  await flushPromises()
  expect(saveEventRule).toHaveBeenCalledWith(
    2,
    'CPU_USAGE',
    expect.objectContaining({ severity: 'FATAL' }),
    undefined,
  )
  expect(view.get('article .badge').text()).toBe('Fatal')
})
it('shows all four severity levels separately from alert/recovery state', () => {
  const severities = ['MINOR', 'WARNING', 'CRITICAL', 'FATAL'] as const
  wrapper = mount(VpsEventHistory, {
    props: {
      vpsId: 2,
      metricCode: 'CPU_USAGE',
      unit: '%',
      events: severities.map((severity, i): MonitorEvent => ({
        ...event(i + 1),
        severity,
        kind: i === 3 ? 'RECOVERY' : 'ALERT',
      })),
    },
  })
  for (const label of ['Minor', 'Warning', 'Critical', 'Fatal'])
    expect(wrapper.text()).toContain(label)
  const recovery = wrapper.findAll('tbody tr')[0]!
  expect(recovery.text()).toContain('Fatal')
  expect(recovery.text()).toContain('Hồi phục')
})
it('edits a specific object, disables the rule, and requires a deliberate delete click', async () => {
  vi.mocked(getEventRules).mockResolvedValue([rule()])
  const view = await open()
  await view.findAll('article button')[0]!.trigger('click')
  await view.get('#rule-object').setValue('10')
  await view.get('input[type=checkbox]').setValue(false)
  vi.mocked(saveEventRule).mockResolvedValue({ ...rule(), objectKey: '10', enabled: false })
  await view.get('form').trigger('submit')
  await flushPromises()
  expect(saveEventRule).toHaveBeenCalledWith(
    2,
    'CPU_USAGE',
    expect.objectContaining({ objectKey: '10', enabled: false }),
    1,
  )
  await view.findAll('article button')[1]!.trigger('click')
  expect(deleteEventRule).not.toHaveBeenCalled()
  await view.findAll('article button')[1]!.trigger('click')
  await flushPromises()
  expect(deleteEventRule).toHaveBeenCalledWith(2, 'CPU_USAGE', 1)
  expect(view.find('article').exists()).toBe(false)
})
it('keeps unsaved input and displays validation/server failures', async () => {
  const view = await open()
  await view.get('#rule-name').setValue('CPU test')
  await view.get('#rule-samples').setValue('0')
  await view.get('form').trigger('submit')
  expect(saveEventRule).not.toHaveBeenCalled()
  expect(view.get('[role=alert]').text()).toContain('1 đến 100')
  await view.get('#rule-samples').setValue('2')
  vi.mocked(saveEventRule).mockRejectedValue(new Error('network'))
  await view.get('form').trigger('submit')
  await flushPromises()
  expect(view.get('[role=alert]').text()).toContain('Vui lòng thử lại')
  expect((view.get('#rule-name').element as HTMLInputElement).value).toBe('CPU test')
  expect(view.emitted('saved')).toBeUndefined()
})
it('prevents duplicate saves and exposes busy state to the event page', async () => {
  const view = await open()
  let resolve!: (value: EventRule) => void
  vi.mocked(saveEventRule).mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  await view.get('#rule-name').setValue('CPU test')
  await view.get('form').trigger('submit')
  await view.get('form').trigger('submit')
  expect(saveEventRule).toHaveBeenCalledTimes(1)
  expect((view.vm as unknown as { saving: boolean }).saving).toBe(true)
  resolve(rule())
  await flushPromises()
  expect((view.vm as unknown as { saving: boolean }).saving).toBe(false)
})
it('merges live events without duplicates while keeping older history and recovery links', async () => {
  wrapper = mount(VpsEventHistory, {
    props: { vpsId: 2, metricCode: 'CPU_USAGE', unit: '%', events: [event(1)] },
  })
  await wrapper.setProps({
    events: [{ ...event(2), kind: 'RECOVERY', value: 40, openedEventId: 1 }, event(1)],
  })
  await wrapper.setProps({
    events: [{ ...event(2), kind: 'RECOVERY', value: 40, openedEventId: 1 }, event(1)],
  })
  expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  expect(wrapper.text()).toContain('Hồi phục event #1')
  expect(wrapper.text()).toContain('40 %')
})
it('loads older events by cursor and does not lose a live event arriving during the request', async () => {
  const first = Array.from({ length: 50 }, (_, i) => event(100 - i))
  wrapper = mount(VpsEventHistory, {
    props: { vpsId: 2, metricCode: 'CPU_USAGE', unit: '%', events: first },
  })
  let resolve!: (events: MonitorEvent[]) => void
  vi.mocked(getMonitorEvents).mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  await wrapper.get('button').trigger('click')
  expect(getMonitorEvents).toHaveBeenCalledWith(2, 'CPU_USAGE', 51, expect.any(AbortSignal))
  await wrapper.setProps({ events: [event(101), ...first.slice(0, 49)] })
  resolve([event(50)])
  await flushPromises()
  expect(wrapper.findAll('tbody tr')).toHaveLength(52)
  expect(wrapper.findAll('tbody tr')[0]!.text()).toContain('#101')
  expect(wrapper.find('button').exists()).toBe(false)
})
it('resets pagination after a reconnect gap and ignores an older page from before the gap', async () => {
  const first = Array.from({ length: 50 }, (_, i) => event(100 - i))
  wrapper = mount(VpsEventHistory, {
    props: { vpsId: 2, metricCode: 'CPU_USAGE', unit: '%', events: first },
  })
  let resolve!: (events: MonitorEvent[]) => void
  vi.mocked(getMonitorEvents).mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  await wrapper.get('button').trigger('click')
  await wrapper.setProps({ events: Array.from({ length: 50 }, (_, i) => event(200 - i)) })
  resolve([event(50)])
  await flushPromises()
  expect(wrapper.findAll('tbody tr')).toHaveLength(50)
  vi.mocked(getMonitorEvents).mockResolvedValue([event(150)])
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(getMonitorEvents).toHaveBeenLastCalledWith(2, 'CPU_USAGE', 151, expect.any(AbortSignal))
  expect(wrapper.findAll('tbody tr')).toHaveLength(51)
})
