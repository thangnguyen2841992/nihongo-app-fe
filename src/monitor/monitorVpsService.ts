import axios from 'axios'
import {gatewayUrl} from "@/api/authApi.ts";

export interface RegisterVpsRequest {
  ipAddress: string
  agentPort: number
}

export interface MonitorVps {
  vpsId: number
  hostname: string
  ipAddress: string
  agentPort: number
  osType: string
  osVersion: string
  architecture: string
  status: string
  lastSeenAt: string
}

export const registerVps = async (request: RegisterVpsRequest): Promise<MonitorVps> => {
  const response = await gatewayUrl.post('/api/staff/vps', request)
  return response.data
}
