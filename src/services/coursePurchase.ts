import { gatewayUrl } from '@/api/authApi'

export async function purchaseCourse(owner: string, courseId: number, packageId: number, renewal: boolean) {
  const storageKey = ['course-purchase', owner, courseId, packageId, renewal].join(':')
  let key = sessionStorage.getItem(storageKey)
  if (!key) {
    key = crypto.randomUUID()
    sessionStorage.setItem(storageKey, key)
  }
  try {
    const response = await gatewayUrl.post(
      renewal ? '/api/nihongo-user/subscriptions/renew' : '/api/nihongo-user/subscriptions',
      null, { params: { courseId, packageId }, headers: { 'Idempotency-Key': key } },
    )
    sessionStorage.removeItem(storageKey)
    window.dispatchEvent(new Event('wallet:changed'))
    return response.data
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } }).response?.status
    // A timeout may hide a committed payment: retain the key until a definitive response.
    if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
      sessionStorage.removeItem(storageKey)
    }
    throw error
  }
}
