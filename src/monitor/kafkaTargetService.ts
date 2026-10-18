import { gatewayUrl } from '@/api/authApi'
import type { MonitorVps } from './monitorVpsService'

export type KafkaSecurityProtocol = 'PLAINTEXT' | 'SSL' | 'SASL_SSL'
export type KafkaSaslMechanism = 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512'

export interface KafkaTargetRequest {
  name: string
  bootstrapServers: string
  securityProtocol: KafkaSecurityProtocol
  saslMechanism: KafkaSaslMechanism | null
  username: string | null
  password: string | null
}

export interface KafkaProbe {
  clusterId: string | null
  brokerCount: number
  controllerId: number | null
  topicCount: number
  partitionCount: number
  consumerGroupCount: number | null
}

export interface KafkaTarget extends MonitorVps {
  exporterType: 'KAFKA_ADMIN'
  bootstrapServers: string
  securityProtocol: KafkaSecurityProtocol
  saslMechanism: KafkaSaslMechanism | null
}

export const listKafkaTargets = async () =>
  (await gatewayUrl.get<KafkaTarget[]>('/api/staff/kafka-targets')).data

export const probeKafkaTarget = async (request: KafkaTargetRequest) =>
  (await gatewayUrl.post<KafkaProbe>('/api/staff/kafka-targets/probe', request)).data

export const registerKafkaTarget = async (request: KafkaTargetRequest) =>
  (await gatewayUrl.post<KafkaTarget>('/api/staff/kafka-targets', request)).data

export const replaceKafkaTargetCredentials = async (
  vpsId: number,
  username: string,
  password: string,
) => {
  await gatewayUrl.put(`/api/staff/kafka-targets/${vpsId}/credentials`, { username, password })
}
