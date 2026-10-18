import { gatewayUrl } from '@/api/authApi'
export type CheckKind = 'PORT_CHECK' | 'WEB_CHECK'
export interface CheckRequest {
  name: string; type: CheckKind; host?: string; port?: number; url?: string; statusMin?: number; statusMax?: number
}
export interface CheckProbe { healthy: boolean; responseMs: number; statusCode: number | null; message: string }
export interface CheckTarget extends CheckRequest {
  vpsId: number; host: string; port: number; status: string; lastSeenAt: string | null
}
export const listCheckTargets = async (signal?: AbortSignal): Promise<CheckTarget[]> =>
  (await gatewayUrl.get('/api/staff/check-targets', { signal })).data
export interface CheckTargetPage { content: CheckTarget[]; number: number; hasNext: boolean }
export const getCheckTargetsPage = async (type: CheckKind, page = 0, signal?: AbortSignal): Promise<CheckTargetPage> =>
  (await gatewayUrl.get('/api/staff/check-targets/page', { params: { type, page, size: 20 }, signal })).data
export const probeCheckTarget = async (input: CheckRequest, signal?: AbortSignal): Promise<CheckProbe> =>
  (await gatewayUrl.post('/api/staff/check-targets/probe', input, { signal })).data
export const registerCheckTarget = async (input: CheckRequest, signal?: AbortSignal): Promise<CheckTarget> =>
  (await gatewayUrl.post('/api/staff/check-targets', input, { signal })).data
