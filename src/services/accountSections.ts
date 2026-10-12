export const accountSections = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: 'bi-person-vcard' },
  { id: 'password', label: 'Đổi mật khẩu', icon: 'bi-lock' },
  { id: 'security', label: 'Xác thực hai bước', icon: 'bi-shield-check' },
  { id: 'history', label: 'Lịch sử đăng nhập', icon: 'bi-clock-history' },
  { id: 'sessions', label: 'Phiên đăng nhập', icon: 'bi-display' },
] as const
export type AccountSection = typeof accountSections[number]['id']
