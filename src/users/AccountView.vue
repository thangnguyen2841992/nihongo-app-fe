<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { gatewayUrl, refreshAccessToken } from '@/api/authApi'
import { setAuth } from '@/services/authState'
import { readFeature, writeFeature, featureError, type Profile, type Page } from '@/services/additionalFeatures'
import { passwordHint, validPassword } from '@/services/passwordPolicy'
import OpsPager from '@/components/operations/OpsPager.vue'
import '@/components/operations/operations.css'
import { accountSections, type AccountSection } from '@/services/accountSections'
import { isLocalLoginAddress, loginDevice, loginMethod, type LoginHistoryEntry } from '@/services/loginHistory'
const props = withDefaults(defineProps<{ section?: AccountSection }>(), { section: 'profile' })
const sectionTitle = computed(() => accountSections.find(section => section.id === props.section)?.label || 'Hồ sơ cá nhân')
const profile = ref<Profile>(), security = ref({ enabled: false, backupCodes: 0 }), history = ref<Page<LoginHistoryEntry>>({ content: [], number: 0, totalPages: 0, totalElements: 0 })
const loginEntries = computed(() => history.value.content.map(entry => ({ ...entry, device: loginDevice(entry.agent), local: isLocalLoginAddress(entry.address), methodLabel: loginMethod(entry.method) })))
const displayName = computed(() => [profile.value?.firstName, profile.value?.lastName].filter(Boolean).join(' ') || 'Tài khoản Nihongo')
const initials = computed(() => displayName.value.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase())
const changing = reactive({ currentPassword: '', password: '', confirmPassword: '' }), proof = reactive({ currentPassword: '', code: '' })
const setup = ref<{ secret: string; uri: string; expiresAt: number }>(), backupCodes = ref<string[]>([]), busy = ref(false), error = ref(''), message = ref(''), signedOut = ref(false)
async function load(page = 0) { try { const [p,s,h] = await Promise.all([readFeature<Profile>('/api/users/me/profile'),props.section === 'security' ? readFeature<typeof security.value>('/api/users/me/security') : Promise.resolve(security.value),props.section === 'history' ? readFeature<Page<LoginHistoryEntry>>('/api/users/me/logins',{page}) : Promise.resolve(history.value)]); profile.value=p;security.value=s;history.value=h } catch(cause){error.value=featureError(cause)} }
async function act(work: () => Promise<void>) { if(busy.value)return;busy.value=true;error.value='';message.value='';try{await work()}catch(cause){error.value=featureError(cause)}finally{busy.value=false} }
const expireLocal = () => { signedOut.value=true;window.dispatchEvent(new Event('auth:expired'));setup.value=undefined;proof.currentPassword='';proof.code='' }
const save = () => act(async()=>{profile.value=(await gatewayUrl.put<Profile>('/api/users/me/profile',profile.value)).data;await refreshAccessToken();await setAuth();message.value='Đã lưu hồ sơ.'})
const changePassword = () => act(async()=>{if(!validPassword(changing.password)||changing.password!==changing.confirmPassword)throw new Error(passwordHint);await writeFeature('/api/users/me/change-password',changing);changing.currentPassword='';changing.password='';changing.confirmPassword='';expireLocal();message.value='Đã đổi mật khẩu và thu hồi phiên. Vui lòng đăng nhập lại.'})
const beginMfa = () => act(async()=>{setup.value=await writeFeature('/api/users/me/mfa/setup',proof);message.value='Thêm tài khoản trong ứng dụng tạo mã bằng khóa bên dưới, rồi nhập mã 6 chữ số.'})
const enable = () => act(async()=>{backupCodes.value=await writeFeature<string[]>('/api/users/me/mfa/enable',{code:proof.code});expireLocal();message.value='Đã bật xác thực hai bước. Lưu mã dự phòng trước khi đăng nhập lại.'})
const disable = () => act(async()=>{await writeFeature('/api/users/me/mfa/disable',proof);expireLocal();message.value='Đã tắt xác thực hai bước. Đăng nhập lại để tiếp tục.'})
const regenerate = () => act(async()=>{backupCodes.value=await writeFeature<string[]>('/api/users/me/mfa/backups',proof);proof.code='';message.value='Mã dự phòng cũ đã bị thay thế.'})
const revoke = () => act(async()=>{await writeFeature('/api/users/me/revoke-session');expireLocal();message.value='Đã thu hồi phiên hiện tại.'})
function downloadBackups(){const blob=new Blob(['Nihongo - mã dự phòng dùng một lần\n'+backupCodes.value.join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='nihongo-backup-codes.txt';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
onMounted(()=>load());onUnmounted(()=>{setup.value=undefined;backupCodes.value=[];proof.currentPassword='';proof.code='';changing.currentPassword='';changing.password='';changing.confirmPassword=''})
</script>
<template>
  <div class="account-page">
    <header class="account-hero">
      <div class="hero-copy"><span class="eyebrow">TÀI KHOẢN VÀ BẢO MẬT</span><h1>{{ sectionTitle }}</h1><p>Cập nhật hồ sơ và quản lý cách bạn đăng nhập vào Nihongo.</p></div>
      <div class="identity"><div class="account-avatar" aria-hidden="true">{{ initials }}</div><div><strong>{{ displayName }}</strong><span>{{ profile?.email || 'Hồ sơ Nihongo' }}</span></div></div>
    </header>
    <nav v-if="!signedOut" class="account-nav" aria-label="Các mục tài khoản"><RouterLink v-for="item in accountSections" :key="item.id" :to="`/account/${item.id}`"><i class="bi" :class="item.icon" aria-hidden="true"></i>{{ item.label }}</RouterLink></nav>
    <p v-if="error" class="account-alert error" role="alert">{{ error }}</p>
    <p v-if="message" class="account-alert success" role="status">{{ message }}</p>
    <section v-if="backupCodes.length" class="account-card backup-panel"><div class="section-heading"><span class="section-icon"><i class="bi bi-key" aria-hidden="true"></i></span><div><h2>Mã dự phòng</h2><p>Mỗi mã dùng một lần. Lưu riêng ở nơi an toàn.</p></div></div><div class="backup-grid"><code v-for="code in backupCodes" :key="code">{{ code }}</code></div><button class="account-button" @click="downloadBackups">Tải mã dự phòng</button></section>
    <RouterLink v-if="signedOut" to="/login" class="account-button">Đăng nhập lại</RouterLink>
    <template v-else>
      <div class="account-columns">
        <section v-if="section === 'profile'" id="account-profile" class="account-card profile-panel">
          <div class="section-heading"><span class="section-icon"><i class="bi bi-person-vcard" aria-hidden="true"></i></span><div><h2>Thông tin cá nhân</h2><p>Thông tin giúp chúng mình nhận diện và liên hệ với bạn.</p></div></div>
          <form v-if="profile" class="account-form" @submit.prevent="save">
            <label>Họ<input v-model="profile.firstName" autocomplete="family-name" required maxlength="100"></label>
            <label>Tên<input v-model="profile.lastName" autocomplete="given-name" required maxlength="100"></label>
            <label class="full">Email<span class="input-with-icon"><i class="bi bi-envelope" aria-hidden="true"></i><input :value="profile.email" type="email" readonly></span><small>Email đang dùng để đăng nhập.</small></label>
            <label>Số điện thoại<input v-model="profile.phone" type="tel" autocomplete="tel" maxlength="30" placeholder="Chưa cập nhật"></label>
            <label>Ngày sinh<input v-model="profile.birthday" type="date" autocomplete="bday"></label>
            <label class="full">Địa chỉ<input v-model="profile.address" autocomplete="street-address" maxlength="255" placeholder="Chưa cập nhật"></label>
            <div class="form-footer full"><span>Thông tin được lưu vào hồ sơ của bạn.</span><button class="account-button" :disabled="busy">{{ busy ? 'Đang xử lý…' : 'Lưu thay đổi' }}</button></div>
          </form>
          <div v-else class="account-empty" role="status">{{ error ? 'Chưa tải được hồ sơ.' : 'Đang tải hồ sơ…' }}<button v-if="error" type="button" class="account-button secondary" @click="load()">Thử lại</button></div>
        </section>
        <div v-if="section === 'password' || section === 'security'" id="account-security" class="security-column">
          <form v-if="section === 'password'" class="account-card password-panel" @submit.prevent="changePassword">
            <div class="section-heading"><span class="section-icon"><i class="bi bi-lock" aria-hidden="true"></i></span><div><h2>Đổi mật khẩu</h2><p>Sử dụng mật khẩu riêng cho tài khoản này.</p></div></div>
            <div class="account-form single"><label>Mật khẩu hiện tại<input v-model="changing.currentPassword" type="password" autocomplete="current-password" required></label><label>Mật khẩu mới<input v-model="changing.password" type="password" autocomplete="new-password" required></label><label>Xác nhận mật khẩu mới<input v-model="changing.confirmPassword" type="password" autocomplete="new-password" required></label><p class="field-hint">{{ passwordHint }}</p><button class="account-button secondary" :disabled="busy">Đổi mật khẩu</button></div>
          </form>
          <section v-if="section === 'security'" class="account-card mfa-panel">
            <div class="section-heading"><span class="section-icon"><i class="bi bi-shield-check" aria-hidden="true"></i></span><div><h2>Xác thực hai bước</h2><p>Thêm một lớp bảo vệ khi đăng nhập.</p></div></div>
            <div class="security-status" :class="{ enabled: security.enabled }"><span class="status-dot"></span><strong>{{ security.enabled ? 'Đang bật' : 'Chưa bật' }}</strong><span>{{ security.backupCodes }} mã dự phòng</span></div>
            <div class="account-form single"><label>Mật khẩu hiện tại<input v-model="proof.currentPassword" type="password" autocomplete="current-password"></label><p v-if="setup" class="setup-key"><strong>Khóa thiết lập</strong><code>{{ setup.secret }}</code></p><label v-if="setup || security.enabled">Mã xác thực / mã dự phòng<input v-model="proof.code" autocomplete="one-time-code" maxlength="40"></label></div>
            <div class="account-actions"><button v-if="!security.enabled && !setup" class="account-button" :disabled="busy || !proof.currentPassword" @click="beginMfa">Thiết lập xác thực hai bước</button><button v-if="setup" class="account-button" :disabled="busy || !proof.code" @click="enable">Xác nhận và bật</button><template v-if="security.enabled"><button class="account-button secondary" :disabled="busy || !proof.code || !proof.currentPassword" @click="regenerate">Tạo mã dự phòng mới</button><button class="account-button danger" :disabled="busy || !proof.code || !proof.currentPassword" @click="disable">Tắt xác thực hai bước</button></template></div>
          </section>
        </div>
      </div>
      <section v-if="section === 'history'" id="account-history" class="account-card history-panel">
        <div class="section-heading"><span class="section-icon"><i class="bi bi-clock-history" aria-hidden="true"></i></span><div><h2>Lịch sử đăng nhập</h2><p>Các lần đăng nhập thành công trong 90 ngày gần đây.</p></div><span class="history-count">{{ history.totalElements }} lần</span></div>
        <div v-if="loginEntries.length" class="login-list">
          <article v-for="entry in loginEntries" :key="entry.id" class="login-entry">
            <span class="device-icon"><i class="bi" :class="entry.device.icon" aria-hidden="true"></i></span>
            <div class="login-details">
              <strong>{{ entry.device.name }}</strong>
              <span class="login-agent">{{ entry.device.browser }} · {{ entry.methodLabel }}</span>
              <div class="login-address"><span>IP: <code>{{ entry.address || 'Chưa ghi nhận' }}</code></span><span v-if="entry.local" class="local-badge">Kết nối local</span></div>
              <div v-if="entry.localAddresses" class="login-address"><span>IP LAN: <code>{{ entry.localAddresses.split(',').join(', ') }}</code></span></div>
              <details v-if="entry.agent" class="login-technical"><summary>Thông tin trình duyệt</summary><p>{{ entry.agent }}</p></details>
            </div>
            <time :datetime="entry.createdAt">{{ new Date(entry.createdAt).toLocaleString('vi-VN') }}</time>
          </article>
        </div>
        <p v-else class="account-empty">Chưa có lịch sử đăng nhập để hiển thị.</p>
        <OpsPager :page="history.number" :total-pages="history.totalPages" :total-elements="history.totalElements" :busy="busy" @change="load" />
        <p class="history-note">Thiết bị được nhận diện từ thông tin trình duyệt khi đăng nhập. IP LAN được lưu khi trình duyệt và gateway chạy local trên cùng máy. Bản ghi cũ có thể chưa có thông tin IP LAN.</p>
      </section>
      <section v-if="section === 'sessions'" class="session-panel"><div><h2>Quản lý phiên đăng nhập</h2><p>Thu hồi phiên hiện tại nếu bạn muốn đăng nhập lại hoặc kết thúc phiên trên thiết bị này.</p></div><button class="account-button danger" :disabled="busy" @click="revoke">Thu hồi phiên đăng nhập</button></section>
    </template>
  </div>
</template>

<style scoped>
.account-page { max-width: 1160px; margin: 0 auto; padding: 20px 16px 56px; color: #51455e; }
.account-hero { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px; padding: 30px; border: 1px solid #e5dce9; border-radius: 22px; background: linear-gradient(120deg,#fff9f6,#f2edf8); }
.eyebrow { font-size: var(--learn-text-xs); font-weight: 750; letter-spacing: .14em; color: #a18aab; }
.hero-copy h1 { margin: 8px 0; font-size: clamp(24px,3vw,32px); font-weight: 750; letter-spacing: -.03em; }
.hero-copy p { margin: 0; color: #82758c; font-size: 14px; line-height: 1.7; }
.identity { display: flex; gap: 12px; align-items: center; min-width: 0; }
.account-avatar { display: grid; place-items: center; width: 52px; height: 52px; flex-shrink: 0; border-radius: 16px; background: #e5d9ef; color: #80618d; font-weight: 750; font-size: 18px; }
.identity > div:last-child { display: grid; gap: 4px; min-width: 0; }.identity strong { font-size: 14px; }.identity span { font-size: 12px; color: #8e8198; overflow-wrap: anywhere; }
.account-nav { display: flex; gap: 8px; padding: 18px 0 22px; overflow-x: auto; }
.account-nav a { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 10px 14px; border-radius: 10px; color: #81728e; font-size: 13px; text-decoration: none; white-space: nowrap; }.account-nav a.router-link-exact-active { background: #eee6f4; color: #76578a; }.account-nav a:hover { background: #f0eaf5; }
.account-columns { display: grid; grid-template-columns: minmax(0,1.25fr) minmax(0,1fr); gap: 20px; align-items: start; }
.account-card { padding: 24px; background: #ffffffed; border: 1px solid #e9e2ec; border-radius: 18px; min-width: 0; scroll-margin-top: 90px; box-shadow: 0 5px 20px #55415e05; }.security-column { display: grid; gap: 20px; scroll-margin-top: 90px; }
.section-heading { display: flex; gap: 12px; align-items: center; margin-bottom: 22px; }.section-heading > div { min-width: 0; }.section-icon { display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0; border: 1px solid #e9dfee; border-radius: 11px; background: #f7f2fa; color: #9b80ac; font-size: 18px; }.section-heading h2 { font-size: 17px; font-weight: 700; margin: 0 0 4px; }.section-heading p { margin: 0; font-size: 12px; line-height: 1.7; color: #91849b; }
.account-form { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px 14px; }.account-form.single { grid-template-columns: minmax(0,1fr); gap: 14px; }.account-form .full { grid-column: 1 / -1; }.account-form label { display: grid; gap: 8px; font-size: 12px; font-weight: 650; color: #70617e; min-width: 0; }
.account-form input { box-sizing: border-box; width: 100%; min-width: 0; min-height: 46px; padding: 11px 13px; border: 1px solid #e2dbe8; border-radius: 10px; color: #51455e; background: #fdfcfe; font-size: 14px; outline: none; transition: border-color .15s,box-shadow .15s; }.account-form input:focus { border-color: #b59ac7; box-shadow: 0 0 0 3px #b59ac71c; }.account-form input::placeholder { color: #b1a6b9; }.account-form input[readonly] { background: #f6f3f8; color: #908399; }.account-form label small { font-weight: 400; font-size: var(--learn-text-xs); color: #a093aa; }
.input-with-icon { position: relative; }.input-with-icon i { position: absolute; left: 13px; top: 14px; color: #aa9bb5; }.input-with-icon input { padding-left: 38px; }
.form-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-top: 18px; margin-top: 4px; border-top: 1px solid #f0eaf3; }.form-footer > span { font-size: var(--learn-text-xs); color: #a194aa; }
.account-button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 10px 16px; border: 1px solid #8c739d; border-radius: 10px; background: #8c739d; color: #fff; font-size: 12px; font-weight: 650; text-decoration: none; cursor: pointer; }.account-button:hover { background: #7a608d; }.account-button.secondary { background: #fff; color: #856695; border-color: #ded2e7; }.account-button.secondary:hover { background: #f6f1fa; }.account-button.danger { background: #fff; border-color: #ecd9df; color: #b46e80; }.account-button.danger:hover { background: #fcf2f5; }.account-button:disabled { opacity: .5; cursor: not-allowed; }.account-button:focus-visible,.account-nav a:focus-visible { outline: 3px solid #baa4ca; outline-offset: 3px; }
.field-hint { font-size: var(--learn-text-xs); color: #97899f; line-height: 1.7; margin: 0; }.security-status { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 12px; margin-bottom: 18px; border-radius: 10px; background: #faf6ed; color: #ad9362; font-size: 12px; }.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }.security-status > span:last-child { margin-left: auto; font-size: var(--learn-text-xs); }.security-status.enabled { background: #eff7f1; color: #679077; }.account-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }.account-actions .account-button { flex: 1; }.setup-key { display: grid; gap: 8px; padding: 12px; background: #f6f1fa; border-radius: 10px; font-size: 12px; }.setup-key code { overflow-wrap: anywhere; }
.history-panel { margin-top: 20px; }.history-count { margin-left: auto; white-space: nowrap; font-size: var(--learn-text-xs); background: #f3edf7; color: #937aa3; border-radius: 8px; padding: 6px 10px; }.login-entry { display: flex; align-items: center; gap: 12px; padding: 16px 0; border-top: 1px solid #f0eaf3; }.device-icon { display: grid; place-items: center; flex-shrink: 0; width: 36px; height: 36px; background: #f6f3f9; border-radius: 10px; color: #9e8bae; }.login-details { display: grid; gap: 4px; flex: 1; min-width: 0; }.login-details strong { font-size: 13px; }.login-agent { font-size: 12px; color: #8d8098; overflow-wrap: anywhere; }.login-details small { font-size: var(--learn-text-xs); color: #a296ab; }.login-entry time { font-size: 12px; color: #96889f; white-space: nowrap; }.history-note { margin: 12px 0 0; color: #a094a8; font-size: var(--learn-text-xs); line-height: 1.7; }.history-panel :deep(.ops-pager) { font-size: 12px; color: #97859f; }.history-panel :deep(.ops-button) { border-color: #ded2e7; color: #856695; background: #fff; font-size: 12px; }
.session-panel { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 18px; padding: 22px 24px; margin-top: 20px; border: 1px solid #ecdfe5; border-radius: 16px; background: #fffafb; }.session-panel h2 { margin: 0 0 6px; font-size: 14px; }.session-panel p { margin: 0; max-width: 650px; font-size: 12px; line-height: 1.8; color: #a08b96; }
.account-alert { padding: 14px 16px; border-radius: 12px; font-size: 13px; line-height: 1.8; margin-bottom: 18px; }.account-alert.error { background: #fff0ed; color: #a95353; }.account-alert.success { background: #edf7f0; color: #568267; }.backup-panel { margin-bottom: 20px; }.backup-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(140px,1fr)); gap: 10px; margin-bottom: 18px; }.backup-grid code { padding: 12px; background: #f7f3fa; color: #80618d; border-radius: 8px; text-align: center; }.account-empty { display: grid; gap: 12px; justify-items: center; padding: 28px 12px; color: #a093aa; font-size: 13px; text-align: center; }
@media(max-width:1000px) { .account-columns { grid-template-columns: minmax(0,1fr); }.security-column { grid-template-columns: repeat(2,minmax(0,1fr)); align-items: start; } }
@media(max-width:650px) { .account-page { padding: 8px 0 32px; }.account-hero { padding: 22px 18px; gap: 20px; }.identity { width: 100%; padding-top: 16px; border-top: 1px solid #e9dfef; }.account-nav { gap: 2px; }.account-nav a { padding: 10px; font-size: 12px; }.account-card { padding: 18px; }.security-column { grid-template-columns: minmax(0,1fr); gap: 16px; }.account-columns { gap: 16px; }.account-form { grid-template-columns: minmax(0,1fr); gap: 16px; }.account-form input { font-size: 16px; }.form-footer { align-items: stretch; }.form-footer .account-button { width: 100%; }.login-entry { align-items: start; flex-wrap: wrap; }.login-entry time { padding-left: 48px; width: 100%; white-space: normal; }.session-panel { padding: 18px; }.session-panel .account-button { width: 100%; }.history-count { font-size: var(--learn-text-xs); padding: 5px 7px; }.section-heading { gap: 10px; }.section-heading p { font-size: var(--learn-text-xs); } }
</style>
<style scoped>
.login-address { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; font-size: 12px; color: #8d8098; }
.login-address code { color: #70617e; overflow-wrap: anywhere; }
.local-badge { padding: 3px 8px; border-radius: 6px; background: #eff5f2; color: #5f8270; font-size: var(--learn-text-xs); }
.login-technical { margin-top: 3px; color: #96889f; font-size: var(--learn-text-xs); }
.login-technical summary { width: fit-content; cursor: pointer; padding: 4px 0; }
.login-technical summary:focus-visible { outline: 2px solid #baa4ca; outline-offset: 3px; }
.login-technical p { max-width: 680px; margin: 6px 0 0; padding: 10px; border-radius: 8px; background: #f8f5fa; overflow-wrap: anywhere; line-height: 1.6; }
.account-columns { display: block; }.security-column { display: block; }.account-card { max-width: 840px; margin: 0 auto; }.account-nav { margin-bottom: 0; }.session-panel { margin-top: 0; }.account-form.single { max-width: 540px; }.history-panel { max-width: none; }.account-hero { margin-bottom: 0; }.backup-panel { margin-bottom: 20px; }
@media(max-width:650px) { .account-nav { margin-bottom: 2px; }.account-nav a { font-size: 12px; } }
</style>
