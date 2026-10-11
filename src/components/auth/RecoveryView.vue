<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { gatewayUrl } from '@/api/authApi'
import { validPassword, passwordHint } from '@/services/passwordPolicy'
import { featureError } from '@/services/additionalFeatures'
import '../operations/operations.css'
const route = useRoute(), recovering = route.path === '/recover-password'
const fragment = new URLSearchParams(window.location.hash.slice(1)), id = ref(fragment.get('id') || ''), token = ref(fragment.get('token') || '')
if (recovering && window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
const email = ref(''), password = ref(''), confirmPassword = ref(''), busy = ref(false), error = ref(''), message = ref('')
async function submit() {
 if (busy.value) return
 error.value = ''; message.value = ''
 if (recovering && (!id.value || !token.value || !validPassword(password.value) || password.value !== confirmPassword.value)) { error.value = !id.value || !token.value ? 'Liên kết không đầy đủ. Hãy yêu cầu một thư mới.' : passwordHint; return }
 busy.value = true
 try {
  if (recovering) { await gatewayUrl.post('/api/auth/recover-password', { id: id.value, token: token.value, password: password.value, confirmPassword: confirmPassword.value }); message.value = 'Đã đặt mật khẩu mới. Đăng nhập lại để tiếp tục.'; token.value = ''; password.value = ''; confirmPassword.value = '' }
  else { const response = await gatewayUrl.post<{ message: string }>('/api/auth/forgot-password', { email: email.value.trim() }); message.value = response.data.message }
 } catch (cause) { error.value = featureError(cause) } finally { busy.value = false }
}
onUnmounted(() => { token.value = ''; password.value = ''; confirmPassword.value = '' })
</script>
<template><main class="ops-page" style="max-width:620px;margin:2rem auto"><RouterLink to="/login">← Đăng nhập</RouterLink><h1>{{ recovering ? 'Đặt lại mật khẩu' : 'Quên mật khẩu' }}</h1><p class="ops-muted">Liên kết được gửi qua email, có hiệu lực 15 phút và chỉ dùng một lần.</p><p v-if="error" class="ops-error" role="alert">{{ error }}</p><p v-if="message" class="ops-success" role="status">{{ message }}</p><form v-if="!recovering || token" class="ops-panel ops-form" @submit.prevent="submit"><label v-if="!recovering" class="wide">Email<input v-model="email" type="email" autocomplete="email" required maxlength="255"></label><template v-else><label class="wide">Mật khẩu mới<input v-model="password" type="password" autocomplete="new-password" required></label><label class="wide">Xác nhận mật khẩu<input v-model="confirmPassword" type="password" autocomplete="new-password" required></label><p class="ops-muted wide">{{ passwordHint }}</p></template><button class="ops-button" :disabled="busy">{{ busy ? 'Đang xử lý...' : recovering ? 'Đặt mật khẩu mới' : 'Gửi liên kết' }}</button></form><p v-if="recovering && !token && !message" class="ops-error">Liên kết chưa đầy đủ hoặc bạn đã tải lại trang.</p><RouterLink v-if="recovering" to="/forgot-password">Yêu cầu liên kết mới</RouterLink></main></template>
