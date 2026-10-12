import { expect, it } from 'vitest'
import { isLocalLoginAddress, loginDevice } from '../loginHistory'

it.each([
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 'Máy tính Windows', 'Microsoft Edge'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36', 'Máy tính Windows', 'Chrome'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1', 'iPhone', 'Safari'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1', 'iPhone', 'Chrome'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/18.0 Mobile/15E148 Safari/604.1', 'iPad', 'Safari'],
  ['Mozilla/5.0 (Linux; Android 14) Chrome/140.0.0.0 Mobile Safari/537.36 SamsungBrowser/28.0', 'Điện thoại Android', 'Samsung Internet'],
  ['Mozilla/5.0 (Linux; Android 14) Chrome/140.0.0.0 Safari/537.36', 'Máy tính bảng Android', 'Chrome'],
  ['Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0', 'Máy tính Linux', 'Firefox'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Chrome/140.0.0.0 Safari/537.36 OPR/120.0', 'Máy tính Mac', 'Opera'],
  [null, 'Thiết bị chưa xác định', 'Trình duyệt chưa xác định'],
])('recognizes the stored device and browser: %s', (agent, name, browser) => {
  expect(loginDevice(agent)).toMatchObject({ name, browser })
})

it.each(['127.0.0.1', '127.0.1.2', '::1', '[::1]', '0:0:0:0:0:0:0:1', '::ffff:127.0.0.1', 'localhost'])('labels loopback %s as local', ip => {
  expect(isLocalLoginAddress(ip)).toBe(true)
})
it.each([null, '', '192.168.1.2', '8.8.8.8', '127.999.0.1', '127.0.01', '2001:db8::1'])('does not label %s as loopback', ip => {
  expect(isLocalLoginAddress(ip)).toBe(false)
})
