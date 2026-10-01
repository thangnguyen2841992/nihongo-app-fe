import { gatewayUrl } from '@/api/authApi'
import type { MonitorVps } from './monitorVpsService'

export interface MysqlTargetRequest {
  name: string
  host: string
  port: number
  username: string
  password: string
  sslMode: 'VERIFY_IDENTITY' | 'DISABLED'
}

export interface MysqlProbe {
  version: string | null
  uptimeSeconds: number | null
  threadsConnected: number | null
  threadsRunning: number | null
}

export const listMysqlTargets = async () =>
  (await gatewayUrl.get<MonitorVps[]>('/api/staff/mysql-targets')).data

export const probeMysqlTarget = async (request: MysqlTargetRequest) =>
  (await gatewayUrl.post<MysqlProbe>('/api/staff/mysql-targets/probe', request)).data

export const registerMysqlTarget = async (request: MysqlTargetRequest) =>
  (await gatewayUrl.post<MonitorVps>('/api/staff/mysql-targets', request)).data
