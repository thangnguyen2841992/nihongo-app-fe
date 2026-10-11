import { beforeEach, expect, it, vi } from 'vitest'
const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: { post } }))
import { purchaseCourse } from '../coursePurchase'
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear() })
it('reuses the request key after an ambiguous failure and clears it on success', async () => {
 post.mockRejectedValueOnce(new Error('connection lost')).mockResolvedValue({ data: { id: 1 } })
 await expect(purchaseCourse('owner', 1, 2, true)).rejects.toThrow('connection lost')
 const first = post.mock.calls[0]![2]!.headers!['Idempotency-Key']
 await purchaseCourse('owner', 1, 2, true)
 expect(post.mock.calls[1]![2]!.headers!['Idempotency-Key']).toBe(first)
 await purchaseCourse('owner', 1, 2, true)
 expect(post.mock.calls[2]![2]!.headers!['Idempotency-Key']).not.toBe(first)
})
it('scopes retries to the owner and the selected package', async () => {
 post.mockRejectedValue(new Error('offline'))
 for (const args of [['a',1,2,false],['b',1,2,false],['a',1,3,false]] as const) {
   await expect(purchaseCourse(args[0], args[1], args[2], args[3])).rejects.toThrow('offline')
 }
 const keys = post.mock.calls.map(c => c[2]!.headers!['Idempotency-Key'])
 expect(new Set(keys).size).toBe(3)
})
it('keeps the original coupon and price on an ambiguous payment and prevents a changed coupon retry', async () => {
 post.mockRejectedValueOnce(new Error('connection lost')).mockResolvedValue({ data: { id: 1 } })
 await expect(purchaseCourse('owner',1,2,true,'promo',9000)).rejects.toThrow('connection lost')
 await expect(purchaseCourse('owner',1,2,true,'other',8000)).rejects.toThrow('mã giảm giá ban đầu')
 expect(post).toHaveBeenCalledTimes(1)
 await purchaseCourse('owner',1,2,true,'PROMO',10000)
 expect(post.mock.calls[1]![2]!.params).toEqual({ courseId:1,packageId:2,couponCode:'PROMO',expectedAmount:9000 })
 expect(post.mock.calls[1]![2]!.headers!['Idempotency-Key']).toBe(post.mock.calls[0]![2]!.headers!['Idempotency-Key'])
 expect(sessionStorage.length).toBe(0)
})
