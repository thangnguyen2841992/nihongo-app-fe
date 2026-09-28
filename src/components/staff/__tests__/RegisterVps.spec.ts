import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RegisterVps from '../monitor/RegisterVps.vue'
import { discoveryVps, registerVps, listVps } from '@/monitor/monitorVpsService'

vi.mock('@/monitor/monitorVpsService', () => ({ discoveryVps: vi.fn(), registerVps: vi.fn(), listVps: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
it('loads registered VPS when opening the list and allows hiding it', async () => {
  vi.mocked(listVps).mockResolvedValue([{ vpsId: 1, hostname: 'vps-8sz0fc', ipAddress: '160.22.107.232', agentPort: 9100, osType: 'Linux', osVersion: '24.04', architecture: 'amd64', status: 'UNKNOWN', lastSeenAt: '' }])
  const wrapper = mount(RegisterVps)
  expect(listVps).not.toHaveBeenCalled()
  await wrapper.get('.list-toggle').trigger('click')
  await flushPromises()
  expect(wrapper.get('#registered-vps-list tbody').text()).toContain('vps-8sz0fc')
  await wrapper.get('.dialog-close').trigger('click')
  expect(wrapper.find('#registered-vps-list').exists()).toBe(false)
  wrapper.unmount()
})
it('shows list errors and supports retry through refresh', async () => {
  vi.mocked(listVps).mockRejectedValueOnce({ isAxiosError: true }).mockResolvedValueOnce([])
  const wrapper = mount(RegisterVps)
  await wrapper.get('.list-toggle').trigger('click')
  await flushPromises()
  expect(wrapper.get('#registered-vps-list [role="alert"]').text()).toContain('kiểm tra mạng')
  await wrapper.get('#registered-vps-list .list-toolbar button').trigger('click')
  await flushPromises()
  expect(wrapper.get('#registered-vps-list').text()).toContain('Chưa có VPS nào')
  wrapper.unmount()
})
const discovered = { installed: true, ipAddress: '160.22.107.232', port: 9100, hostname: 'vps-8sz0fc', osType: 'Linux', osVersion: '24.04', architecture: 'amd64', nodeExporterVersion: '1.9', message: '' }
async function ready() {
  vi.mocked(discoveryVps).mockResolvedValue(discovered)
  const wrapper = mount(RegisterVps)
  await wrapper.get('#vps-ip').setValue(discovered.ipAddress)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  return wrapper
}
it('shows duplicate errors above the form and keeps discovered information for retry', async () => {
  vi.mocked(registerVps).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'VPS này đã được đăng ký.' } } })
  const wrapper = await ready()
  await wrapper.get('.btn-register').trigger('click')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('VPS này đã được đăng ký.')
  expect(wrapper.get('.server-summary').text()).toContain('vps-8sz0fc')
  expect(wrapper.html().indexOf('role="alert"')).toBeLessThan(wrapper.html().indexOf('<form'))
  wrapper.unmount()
})
it('shows a readable network error', async () => {
  vi.mocked(discoveryVps).mockRejectedValue({ isAxiosError: true })
  const wrapper = mount(RegisterVps)
  await wrapper.get('#vps-ip').setValue('160.22.107.232')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('kiểm tra mạng')
  wrapper.unmount()
})
it('rejects invalid ports before calling the server', async () => {
  const wrapper = mount(RegisterVps)
  await wrapper.get('#vps-ip').setValue('160.22.107.232')
  await wrapper.get('#vps-port').setValue(65536)
  await wrapper.get('form').trigger('submit')
  expect(discoveryVps).not.toHaveBeenCalled()
  expect(wrapper.get('[role="alert"]').text()).toContain('65535')
  wrapper.unmount()
})
it('disables registration after success', async () => {
  vi.mocked(registerVps).mockResolvedValue({ ...discovered, agentPort: 9100, vpsId: 1, status: 'UNKNOWN', lastSeenAt: '' })
  const wrapper = await ready()
  await wrapper.get('.btn-register').trigger('click')
  await flushPromises()
  expect(wrapper.get('[role="status"]').text()).toContain('Đăng ký VPS thành công')
  expect(wrapper.get('.btn-register').attributes('disabled')).toBeDefined()
  wrapper.unmount()
})
it('explains when persistence succeeded but SSH synchronization failed', async () => {
  vi.mocked(registerVps).mockRejectedValue({ isAxiosError: true, response: { status: 503, data: { message: 'Thay đổi đã được lưu, nhưng chưa đồng bộ được với Prometheus. Không đăng ký lại VPS.' } } })
  const wrapper = await ready()
  await wrapper.get('.btn-register').trigger('click')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Không đăng ký lại VPS')
  wrapper.unmount()
})
