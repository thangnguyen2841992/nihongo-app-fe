export function clearAuthenticationStorage() {
  for (const key of ['sessionId', 'passwordSetup', 'email-register', 'userId-register']) {
    sessionStorage.removeItem(key)
  }
}
