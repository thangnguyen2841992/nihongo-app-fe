import { gatewayUrl } from "@/api/authApi.ts";


export interface DiscoveryVpsRequest {
  ipAddress: string
  agentPort: number
}
export interface RegisterVpsRequest {
  ipAddress: string
  agentPort: number
  hostname?: string | null
  osType?: string | null
  osVersion?: string | null
  architecture?: string | null
}

export interface NodeExporterDiscoveryResult {
  installed: boolean
  ipAddress: string
  port: number
  hostname: string | null
  osType: string | null
  osVersion: string | null
  architecture: string | null
  exporterType?: 'NODE_EXPORTER' | 'WINDOWS_EXPORTER' | 'MYSQL_JDBC' | 'KAFKA_ADMIN' | 'PORT_CHECK' | 'WEB_CHECK'
  nodeExporterVersion: string | null
  message: string
}

export interface MonitorVps {
  vpsId: number
  hostname: string
  ipAddress: string
  agentPort: number
  exporterType?: 'NODE_EXPORTER' | 'WINDOWS_EXPORTER' | 'MYSQL_JDBC' | 'KAFKA_ADMIN' | 'PORT_CHECK' | 'WEB_CHECK'
  osType: string
  osVersion: string
  architecture: string
  status: string
  lastSeenAt: string
  bootstrapServers?: string | null
  securityProtocol?: 'PLAINTEXT' | 'SSL' | 'SASL_SSL' | null
  saslMechanism?: 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512' | null
}

export const listVps = async (signal?: AbortSignal): Promise<MonitorVps[]> => {
  const response = await gatewayUrl.get('/api/staff/vps', { signal })
  return response.data
}

export function monitoringTargetLabel(target?: Pick<MonitorVps, 'exporterType'>): string {
  switch (target?.exporterType) {
    case 'MYSQL_JDBC': return 'MySQL'
    case 'KAFKA_ADMIN': return 'Kafka'
    case 'PORT_CHECK': return 'Port Check'
    case 'WEB_CHECK': return 'Web Check'
    default: return 'VPS'
  }
}

export const    discoveryVps = async (
  request: DiscoveryVpsRequest
): Promise<NodeExporterDiscoveryResult> => {

  const response = await gatewayUrl.post(
    '/api/staff/vps/discovery',
    request
  )

  return response.data
}

export const registerVps = async (
  request: RegisterVpsRequest
): Promise<MonitorVps> => {

  const response = await gatewayUrl.post(
    '/api/staff/vps/register',
    request
  )

  return response.data
}
