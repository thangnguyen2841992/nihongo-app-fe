import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

const sharedSettingsPath = fileURLToPath(new URL('../.local/shared.properties', import.meta.url))
const publicKeys = ['VITE_GATEWAY_URL', 'VITE_AUTH_WS_URL'] as const
const publicSettings: Record<string, string> = {}

if (existsSync(sharedSettingsPath)) {
  for (const line of readFileSync(sharedSettingsPath, 'utf8').split(/\r?\n/)) {
    const match = /^(VITE_GATEWAY_URL|VITE_AUTH_WS_URL)=(.*)$/.exec(line)
    if (match) publicSettings[match[1]] = match[2].trim()
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
 const publicDefines: Record<string, string> = {}
 for (const key of publicKeys) {
   // Deployment builds must not inherit this workstation's localhost URLs.
   const value = process.env[key] ?? (mode === 'development' ? publicSettings[key] : undefined)
   if (value !== undefined) publicDefines[`import.meta.env.${key}`] = JSON.stringify(value)
 }
 return ({
  define: publicDefines,
  plugins: [
    vue(),
    vueJsx(),
    ...(command === 'serve' ? [vueDevTools()] : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
 })
})
