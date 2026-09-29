export const passwordHint = 'Ít nhất 8 ký tự, tối đa 72 byte UTF-8, gồm chữ hoa, chữ thường, số và ký tự đặc biệt'

export function validPassword(password: string): boolean {
  return password.length >= 8 && new TextEncoder().encode(password).length <= 72
    && /[a-z]/.test(password) && /[A-Z]/.test(password)
    && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)
}
