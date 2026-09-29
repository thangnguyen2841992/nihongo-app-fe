import { gatewayUrl } from '@/api/authApi'

export type EventOperator = 'GT' | 'GTE' | 'LT' | 'LTE'
export type EventSeverity = 'MINOR' | 'WARNING' | 'CRITICAL' | 'FATAL'
export interface EventRuleInput {
  name: string
  objectKey: string
  operator: EventOperator
  threshold: number
  severity: EventSeverity
  consecutiveSamples: number
  enabled: boolean
}
export interface EventRule extends EventRuleInput {
  ruleId: number
  activeObjects: number
}
export interface MonitorEvent {
  eventId: number
  ruleId: number
  ruleName: string
  objectKey: string
  objectName: string
  kind: 'ALERT' | 'RECOVERY'
  severity: EventSeverity
  operator: EventOperator
  threshold: number
  value: number
  timestamp: number
  openedEventId: number | null
}
const base = (vpsId: number, code: string) =>
  `/api/staff/vps/${vpsId}/metrics/${encodeURIComponent(code)}`
export const getEventRules = async (vpsId: number, code: string, signal?: AbortSignal) =>
  (await gatewayUrl.get<EventRule[]>(`${base(vpsId, code)}/event-rules`, { signal })).data
export const saveEventRule = async (
  vpsId: number,
  code: string,
  input: EventRuleInput,
  id?: number,
) =>
  (id == null
    ? await gatewayUrl.post<EventRule>(`${base(vpsId, code)}/event-rules`, input)
    : await gatewayUrl.put<EventRule>(`${base(vpsId, code)}/event-rules/${id}`, input)
  ).data
export const deleteEventRule = (vpsId: number, code: string, id: number) =>
  gatewayUrl.delete(`${base(vpsId, code)}/event-rules/${id}`)
export const getMonitorEvents = async (
  vpsId: number,
  code: string,
  beforeId: number,
  signal?: AbortSignal,
) =>
  (
    await gatewayUrl.get<MonitorEvent[]>(`${base(vpsId, code)}/events`, {
      params: { beforeId },
      signal,
    })
  ).data
export const operatorLabels: Record<EventOperator, string> = {
  GT: '>',
  GTE: '≥',
  LT: '<',
  LTE: '≤',
}
export const severityLabels: Record<EventSeverity, string> = {
  MINOR: 'Minor',
  WARNING: 'Warning',
  CRITICAL: 'Critical',
  FATAL: 'Fatal',
}
