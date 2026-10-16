import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vitest'
import AdminUsers from './AdminUsers.vue'

const mocks = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('@/services/adminAccounts', () => ({
  listAccounts: mocks.list,
  accountHistory: vi.fn(), inviteAccount: vi.fn(), updateAccountRole: vi.fn(), updateAccountStatus: vi.fn(),
}))
const account = { userId: 'u1', email: 'user@example.com', fullName: 'Nguyễn An', role: 'USER', active: true, activationPending: false, createdAt: null, lastLogin: null }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.list.mockImplementation(async (page: number) => ({ content: [account], number: page, totalElements: 30, totalPages: 2 }))
})

it('loads and changes bounded account pages', async () => {
  const wrapper = mount(AdminUsers); await flushPromises()
  expect(mocks.list).toHaveBeenCalledWith(0, '')
  expect(wrapper.text()).toContain('user@example.com')
  await wrapper.findAll('button').find(button => button.text() === 'Sau')!.trigger('click'); await flushPromises()
  expect(mocks.list).toHaveBeenLastCalledWith(1, '')
  wrapper.unmount()
})
