import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('@/api/authApi', () => ({ gatewayUrl: { post: vi.fn() } }))
import { gatewayUrl } from '@/api/authApi'
import { purchaseCourse } from '../coursePurchase'
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear() })
it('reuses the request key after an ambiguous failure and clears it on success', async () => {
 vi.mocked(gatewayUrl.post).mockRejectedValueOnce(new Error('connection lost')).mockResolvedValue({ data: { id: 1 } })
 await expect(purchaseCourse('owner', 1, 2, true)).rejects.toThrow()
 const first = vi.mocked(gatewayUrl.post).mock.calls[0]![2]!.headers!['Idempotency-Key']
 await purchaseCourse('owner', 1, 2, true)
 expect(vi.mocked(gatewayUrl.post).mock.calls[1]![2]!.headers!['Idempotency-Key']).toBe(first)
 await purchaseCourse('owner', 1, 2, true)
 expect(vi.mocked(gatewayUrl.post).mock.calls[2]![2]!.headers!['Idempotency-Key']).not.toBe(first)
})
it('scopes retries to the owner and the selected package', async () => {
 vi.mocked(gatewayUrl.post).mockRejectedValue(new Error('offline'))
 for (const args of [['a',1,2,false],['b',1,2,false],['a',1,3,false]] as const) {
   await expect(purchaseCourse(args[0], args[1], args[2], args[3])).rejects.toThrow()
 }
 const keys = vi.mocked(gatewayUrl.post).mock.calls.map(c => c[2]!.headers!['Idempotency-Key'])
 expect(new Set(keys).size).toBe(3)
})
