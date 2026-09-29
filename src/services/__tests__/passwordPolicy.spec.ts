import { expect, it } from 'vitest'
import { validPassword } from '../passwordPolicy'
import { clearAuthenticationStorage } from '../authStorage'

it('accepts strong passwords and enforces the UTF-8 BCrypt boundary', () => {
  expect(validPassword('Strong-password9!')).toBe(true)
  expect(validPassword('Aa1!' + 'x'.repeat(68))).toBe(true)
  expect(validPassword('Aa1!' + 'x'.repeat(69))).toBe(false)
  expect(validPassword('Aa1!' + '日'.repeat(23))).toBe(false)
  expect(validPassword('UPPERCASE1!')).toBe(false)
})

it('removes authentication grants without clearing preferences or purchase retry keys', () => {
  sessionStorage.setItem('passwordSetup', 'grant')
  sessionStorage.setItem('sessionId', 'session')
  sessionStorage.setItem('purchase-retry', 'retry')
  localStorage.setItem('display-theme', 'soft')
  clearAuthenticationStorage()
  expect(sessionStorage.getItem('passwordSetup')).toBeNull()
  expect(sessionStorage.getItem('sessionId')).toBeNull()
  expect(sessionStorage.getItem('purchase-retry')).toBe('retry')
  expect(localStorage.getItem('display-theme')).toBe('soft')
})
