import { gatewayUrl } from '@/api/authApi'

export interface UserProfile {
  fullName: string | null
  email: string | null
  phoneNumber: string | null
  address: string | null
}

export async function getUserProfile(email: string, signal?: AbortSignal): Promise<UserProfile> {
  const { data } = await gatewayUrl.get<UserProfile>('/api/users/findUserByEmail', {
    params: { email },
    signal,
  })
  if (!data) throw new Error('Không tìm thấy thông tin người dùng')
  return data
}
