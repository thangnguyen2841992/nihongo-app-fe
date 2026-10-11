import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules() })
async function endpoints(origin: string) {
  vi.resetModules()
  vi.stubEnv('VITE_GATEWAY_URL', '')
  vi.stubEnv('VITE_AUTH_WS_URL', '')
  const url = new URL(origin)
  vi.stubGlobal('window', { location: { protocol: url.protocol, origin: url.origin, hostname: url.hostname } })
  return import('../endpoints')
}
describe('gateway and socket deployment URLs', () => {
  it('uses HTTP gateway and its socket locally', async () => {
    const result = await endpoints('http://localhost:5173')
    expect(result.gatewayBaseUrl).toBe('http://localhost:8082')
    expect(result.authSocketUrl).toBe('ws://localhost:8082/ws/native')
  })
  it('keeps the host consistent when local uses 127.0.0.1', async () => {
    const result = await endpoints('http://127.0.0.1:5173')
    expect(result.gatewayBaseUrl).toBe('http://127.0.0.1:8082')
    expect(result.authSocketUrl).toBe('ws://127.0.0.1:8082/ws/native')
  })
  it('uses the HTTPS site and WSS socket on the server', async () => {
    const result = await endpoints('https://learn.example.com')
    expect(result.gatewayBaseUrl).toBe('https://learn.example.com')
    expect(result.authSocketUrl).toBe('wss://learn.example.com/ws/native')
  })
})
