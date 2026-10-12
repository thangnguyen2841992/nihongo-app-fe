export interface LoginHistoryEntry {
  id: number
  method: string
  address: string | null
  localAddresses?: string | null
  agent: string | null
  createdAt: string
}

// Describe the agent stored for this login, never the browser viewing the history.
// User-Agent identifies a device category, not its owner-assigned computer name.
export function loginDevice(agent: string | null | undefined) {
  const ua = agent || ''
  let name = 'Thiết bị chưa xác định'
  let icon = 'bi-question-circle'
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile\//i.test(ua))) {
    name = 'iPad'; icon = 'bi-tablet'
  } else if (/iPhone|iPod/i.test(ua)) {
    name = /iPod/i.test(ua) ? 'iPod' : 'iPhone'; icon = 'bi-phone'
  } else if (/Android/i.test(ua)) {
    const mobile = /Mobile/i.test(ua)
    name = mobile ? 'Điện thoại Android' : 'Máy tính bảng Android'
    icon = mobile ? 'bi-phone' : 'bi-tablet'
  } else if (/Windows/i.test(ua)) {
    name = 'Máy tính Windows'; icon = 'bi-display'
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    name = 'Máy tính Mac'; icon = 'bi-laptop'
  } else if (/CrOS/i.test(ua)) {
    name = 'Chromebook'; icon = 'bi-laptop'
  } else if (/Linux|X11/i.test(ua)) {
    name = 'Máy tính Linux'; icon = 'bi-display'
  }

  // Chromium browsers and iOS browsers also contain Chrome/Safari tokens.
  let browser = 'Trình duyệt chưa xác định'
  if (/Edg(?:e|A|iOS)?\//i.test(ua)) browser = 'Microsoft Edge'
  else if (/OPR\/|Opera|OPiOS\//i.test(ua)) browser = 'Opera'
  else if (/SamsungBrowser\//i.test(ua)) browser = 'Samsung Internet'
  else if (/Firefox\/|FxiOS\//i.test(ua)) browser = 'Firefox'
  else if (/Chrome\/|CriOS\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua)) browser = 'Safari'
  return { name, icon, browser }
}

export function isLocalLoginAddress(address: string | null | undefined) {
  const ip = (address || '').trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/%.+$/, '')
  const ipv4 = ip.replace(/^::ffff:/, '')
  return ip === 'localhost' || ip === '::1' || ip === '0:0:0:0:0:0:0:1'
    || (/^127(?:\.(?:\d{1,3})){3}$/.test(ipv4) && ipv4.split('.').every(part => Number(part) <= 255))
}

export function loginMethod(method: string) {
  return ({ PASSWORD: 'Mật khẩu', GOOGLE: 'Google', MFA: 'Xác thực hai bước' } as Record<string, string>)[method]
    || method || 'Chưa xác định'
}
