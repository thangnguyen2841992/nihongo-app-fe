import { gatewayUrl } from '@/api/authApi'
export interface BroadcastNotice { id: number; title: string; content: string; audience: 'ALL' | 'STAFF' | 'USER'; createdAt: string }
export interface BroadcastPage { content: BroadcastNotice[]; totalPages: number }
export const getBroadcasts = async (page = 0, signal?: AbortSignal): Promise<BroadcastPage> => (await gatewayUrl.get('/api/notification/broadcasts', {
  params: { page, timestamp: Date.now() },
  signal,
})).data
export const sendBroadcast = async (input: Pick<BroadcastNotice, 'title' | 'content' | 'audience'>): Promise<BroadcastNotice> => (await gatewayUrl.post('/api/notification/admin/broadcasts', input)).data
export const getStaffBroadcasts = async (page = 0): Promise<BroadcastPage> => (await gatewayUrl.get('/api/notification/staff/broadcasts', { params: { page } })).data
export const sendStaffBroadcast = async (input: Pick<BroadcastNotice, 'title' | 'content'>): Promise<BroadcastNotice> => (await gatewayUrl.post('/api/notification/staff/broadcasts', input)).data
