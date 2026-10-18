import type { MonitorVps } from './monitorVpsService'

export const targetKinds = [
  { key: 'NODE_EXPORTER', label: 'Linux / Unix', icon: 'bi-hdd-rack' },
  { key: 'WINDOWS_EXPORTER', label: 'Windows', icon: 'bi-windows' },
  { key: 'MYSQL_JDBC', label: 'MySQL', icon: 'bi-database' },
  { key: 'KAFKA_ADMIN', label: 'Kafka', icon: 'bi-diagram-3' },
  { key: 'PORT_CHECK', label: 'Port Check', icon: 'bi-plug' },
  { key: 'WEB_CHECK', label: 'Web Check', icon: 'bi-globe2' },
  { key: 'OTHER', label: 'Khác', icon: 'bi-hdd-network' },
] as const
export function targetKind(target: MonitorVps) {
  const key =
    target.exporterType ||
    (/windows/i.test(target.osType || '') ? 'WINDOWS_EXPORTER' : 'NODE_EXPORTER')
  return targetKinds.find((kind) => kind.key === key) || targetKinds[targetKinds.length - 1]!
}
export function targetStatus(target: MonitorVps): 'UP' | 'DOWN' | 'UNKNOWN' {
  return target.status === 'UP' || target.status === 'DOWN' ? target.status : 'UNKNOWN'
}
export interface Position {
  x: number
  y: number
}
export function topologyLayout(
  targets: MonitorVps[],
  positions: Map<number, Position>,
  columns = 3,
) {
  const buckets = new Map<string, MonitorVps[]>()
  for (const target of targets) {
    const key = targetKind(target).key
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(target)
  }
  const kinds = targetKinds.filter((kind) => buckets.has(kind.key))
  const groups = kinds.map((kind) => ({ ...kind, count: buckets.get(kind.key)!.length }))
  columns = Math.max(1, Math.floor(columns))
  const nodes = groups
    .flatMap((group) =>
      buckets
        .get(group.key)!
        .slice()
        .sort((a, b) => a.vpsId - b.vpsId)
        .map((target) => ({
          target,
          group,
          ...positions.get(target.vpsId),
        })),
    )
    .map((node, index) => ({
      ...node,
      x: node.x ?? 120 + (index % columns) * 190,
      y: node.y ?? 120 + Math.floor(index / columns) * 170,
    }))
  const minX = nodes.length ? Math.min(...nodes.map((node) => node.x - 90)) : 0
  const minY = nodes.length ? Math.min(...nodes.map((node) => node.y - 90)) : 0
  return {
    groups,
    nodes,
    minX,
    minY,
    width: nodes.length ? Math.max(...nodes.map((node) => node.x + 90)) - minX : 180,
    height: nodes.length ? Math.max(...nodes.map((node) => node.y + 90)) - minY : 180,
  }
}
