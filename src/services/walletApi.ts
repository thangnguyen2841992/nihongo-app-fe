import axios from 'axios'
import { gatewayUrl } from '@/api/authApi'

export interface WalletResponse {
  walletId: number
  userId: number
  balance: number
}

export interface DepositWalletRequest {
  amount: number
  description?: string
}

/**
 * Lấy thông tin ví
 */
export const getWallet = async (
  userId: number
): Promise<WalletResponse> => {

  const response = await axios.get<WalletResponse>(
    `${gatewayUrl}/api/users/wallet`,
    {
      params: {
        userId
      },
      withCredentials: true
    }
  )

  return response.data
}

/**
 * Nạp tiền
 */
export const depositWallet = async (
  userId: number,
  data: DepositWalletRequest
): Promise<WalletResponse> => {

  const response = await axios.post<WalletResponse>(
    `${gatewayUrl}/api/users/wallet/deposit`,
    data,
    {
      params: {
        userId
      },
      withCredentials: true
    }
  )

  return response.data
}
