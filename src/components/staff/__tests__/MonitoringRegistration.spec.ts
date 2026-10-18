import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MonitoringRegistration from '../monitor/MonitoringRegistration.vue'
import { listVps } from '@/monitor/monitorVpsService'
import { listMysqlTargets } from '@/monitor/mysqlTargetService'
import { listKafkaTargets } from '@/monitor/kafkaTargetService'
import { getCheckTargetsPage } from '@/monitor/checkTargetService'

vi.mock('@/monitor/monitorVpsService', () => ({ listVps: vi.fn(), discoveryVps: vi.fn(), registerVps: vi.fn() }))
vi.mock('@/monitor/mysqlTargetService', () => ({ listMysqlTargets: vi.fn(), probeMysqlTarget: vi.fn(), registerMysqlTarget: vi.fn(), replaceMysqlTargetPassword: vi.fn() }))
vi.mock('@/monitor/kafkaTargetService', () => ({ listKafkaTargets: vi.fn(), probeKafkaTarget: vi.fn(), registerKafkaTarget: vi.fn(), replaceKafkaTargetCredentials: vi.fn() }))
vi.mock('@/monitor/checkTargetService', () => ({ getCheckTargetsPage: vi.fn(), probeCheckTarget: vi.fn(), registerCheckTarget: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listVps).mockResolvedValue([])
  vi.mocked(listMysqlTargets).mockResolvedValue([])
  vi.mocked(listKafkaTargets).mockResolvedValue([])
  vi.mocked(getCheckTargetsPage).mockResolvedValue({ content: [], number: 0, hasNext: false })
})

async function open(query = '', embedded = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/staff/monitoring/register', component: MonitoringRegistration }],
  })
  await router.push(`/staff/monitoring/register${query}`)
  const wrapper = mount(MonitoringRegistration, { props: { embedded }, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

it('selects a target Type and only shows OS type for servers', async () => {
  const { wrapper, router } = await open()
  expect(wrapper.get('.vps-page').classes()).toContain('embedded')
  expect(wrapper.get('#vps-port').element).toHaveProperty('value', '9100')
  expect(wrapper.text()).toContain('Chọn OS type')

  const mysql = wrapper.findAll('.type-card').find(button => button.text().includes('MySQL'))!
  await mysql.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ type: 'mysql' })
  expect(wrapper.get('.mysql-page').classes()).toContain('embedded')
  expect(wrapper.text()).not.toContain('Chọn OS type')

  const kafka = wrapper.findAll('.type-card').find(button => button.text().includes('Kafka'))!
  await kafka.trigger('click')
  await flushPromises()
  expect(wrapper.get('.kafka-page').classes()).toContain('embedded')
  wrapper.unmount()
})
it('keeps Type and OS changes local when embedded in the topology popup', async () => {
  const { wrapper, router } = await open('', true)
  const initialUrl = router.currentRoute.value.fullPath
  await wrapper.findAll('.os-card').find(button => button.text().includes('Windows'))!.trigger('click'); await flushPromises()
  expect(wrapper.get('#vps-port').element).toHaveProperty('value', '9182')
  await wrapper.findAll('.type-card').find(button => button.text().includes('Port Check'))!.trigger('click'); await flushPromises()
  await wrapper.get('#port-name').setValue('Draft in popup')
  await wrapper.findAll('.type-card').find(button => button.text().includes('Web Check'))!.trigger('click'); await flushPromises()
  await wrapper.findAll('.type-card').find(button => button.text().includes('Port Check'))!.trigger('click'); await flushPromises()
  expect(wrapper.get('#port-name').element).toHaveProperty('value', 'Draft in popup')
  expect(router.currentRoute.value.fullPath).toBe(initialUrl)
  wrapper.unmount()
})

it('keeps OS type in the URL and passes it to the server form', async () => {
  const { wrapper, router } = await open('?type=server&os=linux')
  const windows = wrapper.findAll('.os-card').find(button => button.text().includes('Windows'))!
  await windows.trigger('click')
  await flushPromises()

  expect(router.currentRoute.value.query).toEqual({ type: 'server', os: 'windows' })
  expect(wrapper.get('#vps-port').element).toHaveProperty('value', '9182')
  wrapper.unmount()
})
it('supports Port and Web Check without OS selectors and preserves each form draft', async () => {
  const { wrapper, router } = await open('?type=port')
  await wrapper.get('#port-name').setValue('SSH server')
  await wrapper.findAll('.type-card').find(button => button.text().includes('Web Check'))!.trigger('click'); await flushPromises()
  expect(router.currentRoute.value.query).toEqual({ type: 'web' })
  expect(wrapper.find('#check-url').exists()).toBe(true); expect(wrapper.text()).not.toContain('Chọn OS type')
  expect(vi.mocked(getCheckTargetsPage).mock.calls.map(call => call[0])).toEqual(['PORT_CHECK', 'WEB_CHECK'])
  await wrapper.findAll('.type-card').find(button => button.text().includes('Port Check'))!.trigger('click'); await flushPromises()
  expect(wrapper.get('#port-name').element).toHaveProperty('value', 'SSH server')
  expect(vi.mocked(getCheckTargetsPage).mock.calls.map(call => call[0])).toEqual(['PORT_CHECK', 'WEB_CHECK', 'PORT_CHECK'])
  wrapper.unmount()
})
