import axios from 'axios'
import { gatewayUrl } from '@/api/authApi'

export interface WalletResponse { walletId: number; userId: string; balance: number }
export interface DepositWalletRequest { amount: number; description: string; requestKey: string }
export interface WalletDeposit {
  id: number; userId: string; amount: number; description: string; requestKey: string
  status: 'PENDING' | 'SUCCESS' | 'CANCELLED'; createdAt: string
  bankReference: string | null; reviewNote: string | null; reviewedAt: string | null
}
export interface BankInfo { bankName: string; accountNumber: string; accountName: string }
export interface DepositReview { approve: boolean; bankReference?: string; note?: string }
const base = '/api/nihongo-user/wallets'
export const getWallet = async (): Promise<WalletResponse> => (await gatewayUrl.get(base)).data
export const depositWallet = async (data: DepositWalletRequest): Promise<WalletDeposit> =>
  (await gatewayUrl.post(`${base}/deposit`, data)).data
export const getDeposits = async (): Promise<WalletDeposit[]> => (await gatewayUrl.get(`${base}/deposits`)).data
export const getBankInfo = async (): Promise<BankInfo> => (await gatewayUrl.get(`${base}/bank-info`)).data
export const getAdminDeposits = async (): Promise<WalletDeposit[]> => (await gatewayUrl.get(`${base}/admin/deposits`)).data
export const reviewDeposit = async (id: number, data: DepositReview): Promise<WalletDeposit> =>
  (await gatewayUrl.post(`${base}/admin/deposits/${id}/review`, data)).data
export const walletError = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') return error.response.data.message
  return fallback
}
export const formatMoney = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
export const depositStatus = (status: WalletDeposit['status']) => ({ PENDING: 'Chờ đối soát', SUCCESS: 'Đã cộng tiền', CANCELLED: 'Đã từ chối' })[status]
