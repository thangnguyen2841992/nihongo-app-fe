import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  connect: vi.fn(),
  stop: vi.fn(),
  onChange: undefined as undefined | (() => void),
}))

vi.mock('@/services/supportChat', () => ({ getStaffSupportSummary: mocks.summary }))
vi.mock('@/services/supportRealtime', () => ({
  connectSupportRealtime: mocks.connect,
}))

import {
  staffSupportRealtime,
  staffSupportUnread,
  startStaffSupportNotifications,
} from '@/services/staffSupportNotifications'

let dispose: (() => void) | undefined

beforeEach(() => {
  vi.clearAllMocks()
  staffSupportUnread.value = 0
  mocks.summary.mockResolvedValue({ unreadMessages: 2 })
  mocks.connect.mockImplementation((_staff, onChange, onStatus) => {
    mocks.onChange = onChange
    onStatus('live')
    return mocks.stop
  })
})

afterEach(() => {
  dispose?.()
  dispose = undefined
  mocks.onChange = undefined
})

it('loads the unread total and refreshes it when a realtime chat notice arrives', async () => {
  dispose = startStaffSupportNotifications()
  await flushPromises()

  expect(staffSupportUnread.value).toBe(2)
  expect(staffSupportRealtime.value).toBe('live')

  mocks.summary.mockResolvedValue({ unreadMessages: 5 })
  mocks.onChange?.()
  await flushPromises()

  expect(staffSupportUnread.value).toBe(5)
})
