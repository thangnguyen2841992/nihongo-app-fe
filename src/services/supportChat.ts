import { gatewayUrl } from '@/api/authApi'

export type SupportStatus = 'WAITING_STAFF' | 'WAITING_USER' | 'RESOLVED'
export type SupportSender = 'USER' | 'STAFF' | 'AUTO'

export interface SupportMessage {
  id: number
  senderType: SupportSender
  senderName: string
  content: string
  createdAt: string
}

export interface SupportConversation {
  id: number
  userId: string
  userName?: string
  userEmail?: string
  status: SupportStatus
  lastMessagePreview: string
  unreadForUser: number
  unreadForStaff: number
  createdAt: string
  lastMessageAt: string
  version: number
}

export interface SupportThread {
  conversation: SupportConversation | null
  messages: SupportMessage[]
}

export interface SupportPage {
  content: SupportConversation[]
  totalElements: number
  number: number
  totalPages: number
}

export interface StaffSupportSummary {
  unreadMessages: number
}

const userBase = '/api/nihongo-user/support/chat'
const staffBase = '/api/nihongo-user/staff/support'

export const getSupportThread = async () => (await gatewayUrl.get<SupportThread>(userBase)).data
export const sendSupportMessage = async (content: string, newConversation = false) =>
  (await gatewayUrl.post<SupportThread>(`${userBase}/messages`, { content, newConversation })).data
export const markSupportRead = async () => { await gatewayUrl.post(`${userBase}/read`) }

export const getSupportConversations = async (status = 'ALL', page = 0) =>
  (await gatewayUrl.get<SupportPage>(`${staffBase}/conversations`, { params: { status, page, size: 30 } })).data
export const getStaffSupportSummary = async () =>
  (await gatewayUrl.get<StaffSupportSummary>(`${staffBase}/summary`)).data
export const getStaffSupportThread = async (id: number) =>
  (await gatewayUrl.get<SupportThread>(`${staffBase}/conversations/${id}`)).data
export const sendStaffSupportMessage = async (id: number, content: string) =>
  (await gatewayUrl.post<SupportThread>(`${staffBase}/conversations/${id}/messages`, { content })).data
export const closeSupportConversation = async (id: number) =>
  (await gatewayUrl.post<SupportThread>(`${staffBase}/conversations/${id}/close`)).data
