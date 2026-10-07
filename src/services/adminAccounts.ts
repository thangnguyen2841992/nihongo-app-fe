import { gatewayUrl } from '@/api/authApi'

export interface AdminAccount {
  userId: string
  email: string
  fullName: string
  role: 'USER' | 'STAFF' | 'ADMIN'
  active: boolean
  activationPending: boolean
  createdAt: string | null
  lastLogin: string | null
}
export interface AccountAudit {
  id: number
  actorUserId: string
  targetUserId: string
  action: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
}
const base = '/api/users/admin/accounts'
export const listAccounts = async () => (await gatewayUrl.get<AdminAccount[]>(base)).data
export const inviteAccount = async (input: { email: string; firstName: string; lastName: string; role: AdminAccount['role'] }) =>
  (await gatewayUrl.post<AdminAccount>(base, input)).data
export const updateAccountRole = async (id: string, role: AdminAccount['role']) =>
  (await gatewayUrl.patch<AdminAccount>(`${base}/${encodeURIComponent(id)}/role`, { role })).data
export const updateAccountStatus = async (id: string, active: boolean) =>
  (await gatewayUrl.patch<AdminAccount>(`${base}/${encodeURIComponent(id)}/status`, { active })).data
export const accountHistory = async (id: string) =>
  (await gatewayUrl.get<AccountAudit[]>(`${base}/${encodeURIComponent(id)}/history`)).data
