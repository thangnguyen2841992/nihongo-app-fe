import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import RegisterCheck from '../monitor/RegisterCheck.vue'
import { getCheckTargetsPage, probeCheckTarget, registerCheckTarget, type CheckProbe } from '@/monitor/checkTargetService'
vi.mock('@/monitor/checkTargetService', () => ({ getCheckTargetsPage: vi.fn(), probeCheckTarget: vi.fn(), registerCheckTarget: vi.fn() }))
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.resetAllMocks(); vi.mocked(getCheckTargetsPage).mockResolvedValue({ content: [], number: 0, hasNext: false })
  vi.mocked(probeCheckTarget).mockResolvedValue({ healthy: false, responseMs: 15, statusCode: null, message: 'Không kết nối được tới dịch vụ.' })
  vi.mocked(registerCheckTarget).mockResolvedValue({ vpsId: 9, name: 'SSH', type: 'PORT_CHECK', host: 'localhost', port: 22, status: 'UNKNOWN', lastSeenAt: null })
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; vi.useRealTimers(); vi.restoreAllMocks() })
async function open(checkType: 'port' | 'web' = 'port') {
  wrapper = mount(RegisterCheck, { props: { checkType, embedded: true }, global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
  await flushPromises()
  await wrapper.get(`#${checkType}-name`).setValue('SSH')
  if (checkType === 'port') { await wrapper.get('#check-host').setValue('localhost'); await wrapper.get('#check-port').setValue(22) }
  else await wrapper.get('#check-url').setValue('https://example.com/health')
}
it('lets staff register an unavailable TCP service and links to its performance page', async () => {
  await open(); await wrapper!.get('form').trigger('submit'); await flushPromises()
  expect(wrapper!.get('.probe-result').text()).toContain('DOWN')
  await wrapper!.findAll('button').find(button => button.text() === 'Đăng ký giám sát')!.trigger('click'); await flushPromises()
  expect(registerCheckTarget).toHaveBeenCalledWith({ name: 'SSH', type: 'PORT_CHECK', host: 'localhost', port: 22 }, expect.any(AbortSignal))
  expect(wrapper!.get('.registered a').attributes('href')).toBe('/staff/monitoring/vps/performance?vps=9')
})
it('sends HTTP status criteria and shows the HTTP probe result', async () => {
  vi.mocked(probeCheckTarget).mockResolvedValue({ healthy: true, responseMs: 12, statusCode: 204, message: 'HTTP 204 đúng khoảng mong đợi.' })
  await open('web'); await wrapper!.get('#check-status-max').setValue(299)
  await wrapper!.get('form').trigger('submit'); await flushPromises()
  expect(probeCheckTarget).toHaveBeenCalledWith({ name: 'SSH', type: 'WEB_CHECK', url: 'https://example.com/health', statusMin: 200, statusMax: 299 }, expect.any(AbortSignal))
  expect(wrapper!.get('.probe-result').text()).toContain('UP'); expect(wrapper!.text()).toContain('HTTP 204')
})
it('aborts an old probe and ignores its response when the URL changes', async () => {
  let finish!: (value: CheckProbe) => void
  vi.mocked(probeCheckTarget).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  await open('web'); await wrapper!.get('form').trigger('submit')
  const signal = vi.mocked(probeCheckTarget).mock.calls[0]![1]!
  await wrapper!.get('#check-url').setValue('https://example.com/new')
  expect(signal.aborted).toBe(true)
  finish({ healthy: true, responseMs: 12, statusCode: 200, message: 'Old response' }); await flushPromises()
  expect(wrapper!.find('.probe-result').exists()).toBe(false)
})
it('shows a recoverable list error and a permission error without a success notice', async () => {
  vi.mocked(getCheckTargetsPage).mockRejectedValueOnce(new Error('offline'))
  vi.mocked(registerCheckTarget).mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } })
  await open(); expect(wrapper!.text()).toContain('Thử lại')
  await wrapper!.findAll('button').find(button => button.text() === 'Đăng ký giám sát')!.trigger('click'); await flushPromises()
  expect(wrapper!.text()).toContain('Bạn không có quyền quản lý target.')
  expect(wrapper!.find('.registered').exists()).toBe(false)
})
it('pages on the server and keeps current rows visible during a refresh', async () => {
  const target = { vpsId: 9, name: 'SSH', type: 'PORT_CHECK' as const, host: 'localhost', port: 22, status: 'UP', lastSeenAt: null }
  vi.mocked(getCheckTargetsPage).mockResolvedValueOnce({ content: [target], number: 0, hasNext: true })
  await open()
  expect(getCheckTargetsPage).toHaveBeenCalledWith('PORT_CHECK', 0, expect.any(AbortSignal))
  let finish!: (value: Awaited<ReturnType<typeof getCheckTargetsPage>>) => void
  vi.mocked(getCheckTargetsPage).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  await wrapper!.findAll('button').find(button => button.text() === 'Trang sau')!.trigger('click')
  expect(getCheckTargetsPage).toHaveBeenLastCalledWith('PORT_CHECK', 1, expect.any(AbortSignal))
  expect(wrapper!.text()).toContain('SSH')
  finish({ content: [{ ...target, name: 'Next target' }], number: 1, hasNext: false }); await flushPromises()
  expect(wrapper!.text()).toContain('Next target')
  expect(wrapper!.findAll('button').find(button => button.text() === 'Trang sau')!.attributes('disabled')).toBeDefined()
  await wrapper!.findAll('button').find(button => button.text() === 'Trang trước')!.trigger('click'); await flushPromises()
  expect(getCheckTargetsPage).toHaveBeenLastCalledWith('PORT_CHECK', 0, expect.any(AbortSignal))
})
it('refreshes only while visible, coalesces focus events and stops on unmount', async () => {
  vi.useFakeTimers()
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  await open()
  expect(getCheckTargetsPage).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(30000)
  expect(getCheckTargetsPage).toHaveBeenCalledTimes(2)
  hidden.mockReturnValue(true)
  await vi.advanceTimersByTimeAsync(60000)
  expect(getCheckTargetsPage).toHaveBeenCalledTimes(2)
  hidden.mockReturnValue(false)
  vi.mocked(getCheckTargetsPage).mockImplementationOnce(() => new Promise(() => {}))
  document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus'))
  expect(getCheckTargetsPage).toHaveBeenCalledTimes(3)
  const signal = vi.mocked(getCheckTargetsPage).mock.calls[2]![2]!
  wrapper!.unmount(); wrapper = undefined
  expect(signal.aborted).toBe(true)
  window.dispatchEvent(new Event('focus')); await vi.advanceTimersByTimeAsync(60000)
  expect(getCheckTargetsPage).toHaveBeenCalledTimes(3)
})
it('does not report DOWN when the checker is overloaded', async () => {
  vi.mocked(probeCheckTarget).mockRejectedValueOnce({ isAxiosError: true, response: { status: 503 } })
  await open(); await wrapper!.get('form').trigger('submit'); await flushPromises()
  expect(wrapper!.text()).toContain('Bộ kiểm tra đang bận')
  expect(wrapper!.find('.probe-result').exists()).toBe(false)
})
