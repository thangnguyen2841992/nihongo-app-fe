export const gatewayBaseUrl = new URL(import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8082', window.location.origin).href.replace(/\/$/, '')
const authSocket = new URL(import.meta.env.VITE_AUTH_WS_URL || 'http://localhost:8081/ws/native', window.location.origin)
authSocket.protocol = ['https:', 'wss:'].includes(authSocket.protocol) ? 'wss:' : 'ws:'
if (authSocket.pathname.replace(/\/$/, '') === '/ws') authSocket.pathname = '/ws/native'
export const authSocketUrl = authSocket.href
