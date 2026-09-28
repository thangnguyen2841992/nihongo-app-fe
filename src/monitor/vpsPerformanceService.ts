import { gatewayUrl } from '@/api/authApi'

export interface PerformanceMetric {
  metricId: number
  code: string
  name: string
  unit: string
  objectType: string | null
  scheduleSeconds: number
  timeoutMs: number
  enabled: boolean
}
export interface PerformancePoint {
  timestamp: number
  value: number | null
}
export interface PerformanceObject {
  objectKey: string
  objectName: string
  labels: Record<string, string>
  status: string
  stale: boolean
  points: PerformancePoint[]
}
export interface VpsPerformance {
  vpsId: number
  metricCode: string
  state: 'UP' | 'DOWN' | 'UNKNOWN' | 'PAUSED'
  collectionError: string | null
  objects: PerformanceObject[]
}
export interface MetricConfig {
  assignmentId: number
  code: string
  scheduleSeconds: number | null
  effectiveScheduleSeconds: number
  enabled: boolean
  lastError: string | null
  lastSuccessAt: string | null
}
export interface ConfigUpdate {
  scheduleSeconds: number | null
  timeoutMs?: number
  enabled: boolean
}
export const getPerformanceMetrics = async () =>
  (await gatewayUrl.get<PerformanceMetric[]>('/api/staff/vps-metrics')).data
export const getMetricConfigs = async (id: number, signal?: AbortSignal) =>
  (await gatewayUrl.get<MetricConfig[]>(`/api/staff/vps/${id}/metric-configs`, { signal })).data
export const updateVpsMetricConfig = async (id: number, code: string, update: ConfigUpdate) =>
  (await gatewayUrl.put<MetricConfig>(`/api/staff/vps/${id}/metrics/${code}/config`, update)).data
export const updateDefaultMetricConfig = async (id: number, update: ConfigUpdate) =>
  gatewayUrl.put(`/api/staff/vps-metrics/${id}/config`, update)
export const getVpsPerformance = async (
  id: number,
  metric: string,
  signal: AbortSignal,
  hours?: number,
  objectKey?: string,
) =>
  (
    await gatewayUrl.get<VpsPerformance>(`/api/staff/vps/${id}/performance`, {
      params: { metric, hours, objectKey },
      signal,
      timeout: 35000,
    })
  ).data
