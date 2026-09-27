import { expect, it, vi } from 'vitest'
import { trackAdminActivity } from '../adminActivity'
it('ignores timers, synthetic events and non-admin activity; throttles trusted admin events', () => {
  vi.useFakeTimers()
  const add = vi.spyOn(window, 'addEventListener')
  const remove = vi.spyOn(window, 'removeEventListener')
  const send = vi.fn().mockResolvedValue(undefined)
  let admin = false
  const stop = trackAdminActivity(() => admin, send)
  const handler = add.mock.calls.find(call => call[0] === 'pointerdown')![1] as (event: Event) => void
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  handler({ isTrusted: true } as Event); expect(send).not.toHaveBeenCalled()
  admin = true
  handler({ isTrusted: false } as Event); expect(send).not.toHaveBeenCalled()
  handler({ isTrusted: true } as Event); handler({ isTrusted: true } as Event)
  expect(send).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(60_000); expect(send).toHaveBeenCalledTimes(1)
  handler({ isTrusted: true } as Event); expect(send).toHaveBeenCalledTimes(2)
  stop(); expect(remove).toHaveBeenCalledWith('pointerdown', handler)
  vi.restoreAllMocks(); vi.useRealTimers()
})
