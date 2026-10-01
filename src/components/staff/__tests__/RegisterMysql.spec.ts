import { expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RegisterMysql from '../monitor/RegisterMysql.vue'
import { listMysqlTargets, probeMysqlTarget, registerMysqlTarget } from '@/monitor/mysqlTargetService'

vi.mock('@/monitor/mysqlTargetService', () => ({
  listMysqlTargets: vi.fn(),
  probeMysqlTarget: vi.fn(),
  registerMysqlTarget: vi.fn(),
}))

it('checks MySQL before registering and clears the password afterwards', async () => {
  vi.mocked(listMysqlTargets).mockResolvedValue([])
  vi.mocked(probeMysqlTarget).mockResolvedValue({ version: '8.0', uptimeSeconds: 120, threadsConnected: 3, threadsRunning: 1 })
  vi.mocked(registerMysqlTarget).mockResolvedValue({
    vpsId: 7, hostname: 'DB chính', ipAddress: '127.0.0.1', agentPort: 3306,
    exporterType: 'MYSQL_JDBC', osType: 'MySQL', osVersion: '8.0', architecture: '', status: 'UP', lastSeenAt: '',
  })
  const wrapper = mount(RegisterMysql, { global: { stubs: { RouterLink: true } } })
  await flushPromises()
  await wrapper.get('#mysql-name').setValue('DB chính')
  await wrapper.get('#mysql-host').setValue('127.0.0.1')
  await wrapper.get('#mysql-user').setValue('monitor')
  await wrapper.get('#mysql-password').setValue('secret')
  expect(wrapper.get('.primary').attributes('disabled')).toBeDefined()
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(probeMysqlTarget).toHaveBeenCalledWith(expect.objectContaining({ host: '127.0.0.1', port: 3306, username: 'monitor' }))
  expect(wrapper.get('.probe').text()).toContain('3')
  await wrapper.get('.primary').trigger('click')
  await flushPromises()
  expect(registerMysqlTarget).toHaveBeenCalledOnce()
  expect((wrapper.get('#mysql-password').element as HTMLInputElement).value).toBe('')
  expect(wrapper.get('.success').text()).toContain('DB chính')
  wrapper.unmount()
})
