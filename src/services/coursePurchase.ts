import { gatewayUrl } from '@/api/authApi'

export async function purchaseCourse(owner: string, courseId: number, packageId: number, renewal: boolean, couponCode?: string, expectedAmount?: number) {
  const normalizedCode = couponCode?.trim().toUpperCase() || undefined
  const storageKey = ['course-purchase', owner, courseId, packageId, renewal].join(':')
  const couponKey = storageKey + ':coupon'
  const amountKey = storageKey + ':amount'
  let key = sessionStorage.getItem(storageKey)
  const pendingAmount = key ? sessionStorage.getItem(amountKey) : null
  const amountForRequest = pendingAmount !== null ? Number(pendingAmount) : expectedAmount
  if (key && (sessionStorage.getItem(couponKey) || '') !== (normalizedCode || '')) {
    const error = new Error('Yêu cầu trước chưa xác định kết quả. Hãy thử lại với mã giảm giá ban đầu hoặc bỏ trống nếu trước đó không dùng mã.')
    Object.assign(error, { response: { status: 409, data: { message: error.message } } })
    throw error
  }
  if (!key) {
    key = crypto.randomUUID()
    sessionStorage.setItem(storageKey, key)
    sessionStorage.setItem(couponKey, normalizedCode || '')
    if (expectedAmount !== undefined) sessionStorage.setItem(amountKey, String(expectedAmount))
  }
  try {
    const response = await gatewayUrl.post(
      renewal ? '/api/nihongo-user/subscriptions/renew' : '/api/nihongo-user/subscriptions',
      null, { params: { courseId, packageId, ...(normalizedCode ? { couponCode: normalizedCode } : {}), ...(amountForRequest !== undefined ? { expectedAmount: amountForRequest } : {}) }, headers: { 'Idempotency-Key': key } },
    )
    sessionStorage.removeItem(storageKey)
    sessionStorage.removeItem(couponKey)
    sessionStorage.removeItem(amountKey)
    window.dispatchEvent(new Event('wallet:changed'))
    return response.data
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } }).response?.status
    // A timeout may hide a committed payment: retain the key until a definitive response.
    if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
      sessionStorage.removeItem(storageKey)
      sessionStorage.removeItem(couponKey)
      sessionStorage.removeItem(amountKey)
    }
    throw error
  }
}
