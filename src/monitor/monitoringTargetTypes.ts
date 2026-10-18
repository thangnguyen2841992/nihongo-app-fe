export type MonitoringTargetType = 'server' | 'mysql' | 'kafka' | 'port' | 'web'
export type ServerOsType = 'linux' | 'windows'

export interface MonitoringTargetDefinition {
  id: MonitoringTargetType
  label: string
  description: string
  icon: string
}

export interface ServerOsDefinition {
  id: ServerOsType
  label: string
  description: string
  exporter: 'NODE_EXPORTER' | 'WINDOWS_EXPORTER'
  defaultPort: number
  icon: string
}

export const monitoringTargetTypes: readonly MonitoringTargetDefinition[] = [
  { id: 'server', label: 'Máy chủ', description: 'Giám sát hệ điều hành và tài nguyên máy chủ.', icon: 'bi-server' },
  { id: 'mysql', label: 'MySQL', description: 'Giám sát kết nối, truy vấn và lưu lượng database.', icon: 'bi-database' },
  { id: 'kafka', label: 'Kafka', description: 'Giám sát broker, partition, replica và consumer lag.', icon: 'bi-diagram-3' },
  { id: 'port', label: 'Port Check', description: 'Kiểm tra cổng TCP và thời gian kết nối.', icon: 'bi-ethernet' },
  { id: 'web', label: 'Web Check', description: 'Kiểm tra HTTP/HTTPS, mã phản hồi và độ trễ.', icon: 'bi-globe2' },
]

export const serverOsTypes: readonly ServerOsDefinition[] = [
  { id: 'linux', label: 'Linux', description: 'Thu thập qua Node Exporter.', exporter: 'NODE_EXPORTER', defaultPort: 9100, icon: 'bi-terminal' },
  { id: 'windows', label: 'Windows', description: 'Thu thập qua Windows Exporter.', exporter: 'WINDOWS_EXPORTER', defaultPort: 9182, icon: 'bi-windows' },
]

export function targetType(value: unknown): MonitoringTargetType {
  return monitoringTargetTypes.some(item => item.id === value) ? value as MonitoringTargetType : 'server'
}

export function serverOsType(value: unknown): ServerOsType {
  return serverOsTypes.some(item => item.id === value) ? value as ServerOsType : 'linux'
}
