export const gatewayBaseUrl = new URL(import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8082', window.location.origin).href.replace(/\/$/, '')
export const authSocketUrl = new URL(import.meta.env.VITE_AUTH_WS_URL || 'http://localhost:8081/ws', window.location.origin).href
