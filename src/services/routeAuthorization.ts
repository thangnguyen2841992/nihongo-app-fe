import type { RouteLocationNormalized } from 'vue-router'
import { initAuth, useAuthState } from './authState'

export async function authorizeRoute(to: Pick<RouteLocationNormalized, 'meta' | 'fullPath'>) {
  if (!to.meta.requiresAuth) return true
  const { isAuthReady, isAuthenticated, userRole } = useAuthState()
  if (!isAuthReady.value) await initAuth()
  if (!isAuthenticated.value) return { path: '/login', query: { redirect: to.fullPath } }
  const roles = to.meta.roles
  if (Array.isArray(roles) && !roles.includes(userRole.value)) return { path: '/' }
  return true
}
