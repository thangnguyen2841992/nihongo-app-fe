const defaultGateway = window.location.protocol === 'https:' ? window.location.origin : `http://${window.location.hostname}:8082`
export const gatewayBaseUrl = new URL(import.meta.env.VITE_GATEWAY_URL || defaultGateway, window.location.origin).href.replace(/\/$/, '')
const authSocket = new URL(import.meta.env.VITE_AUTH_WS_URL || `${gatewayBaseUrl}/ws/native`, window.location.origin)
authSocket.protocol = ['https:', 'wss:'].includes(authSocket.protocol) ? 'wss:' : 'ws:'
if (authSocket.pathname.replace(/\/$/, '') === '/ws') authSocket.pathname = '/ws/native'
export const authSocketUrl = authSocket.href
