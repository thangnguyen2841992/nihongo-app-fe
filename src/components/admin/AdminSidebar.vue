<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import AccountMenu from '@/components/common/AccountMenu.vue'

defineProps<{ isOpen?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const route = useRoute()

const groups = [
  { id: 'operation', label: 'Vận hành', icon: 'bi-kanban', items: [
    { to: '/admin/operations', label: 'Trung tâm vận hành', icon: 'bi-activity' },
    { to: '/staff/classrooms', label: 'Lớp học & giao đề', icon: 'bi-mortarboard' },
    { to: '/admin/audit', label: 'Nhật ký quản trị', icon: 'bi-clock-history' },
  ]},
  { id: 'people', label: 'Người dùng & hỗ trợ', icon: 'bi-people', items: [
    { to: '/admin/notifications', label: 'Gửi thông báo', icon: 'bi-megaphone' },
    { to: '/admin/users', label: 'Tài khoản người dùng', icon: 'bi-person-lines-fill' },
    { to: '/admin/support', label: 'Hỗ trợ trực tuyến', icon: 'bi-headset' },
  ]},
  { id: 'business', label: 'Tài chính & kinh doanh', icon: 'bi-wallet2', items: [
    { to: '/admin/revenue', label: 'Báo cáo doanh thu', icon: 'bi-graph-up-arrow' },
    { to: '/admin/wallet-deposits', label: 'Đối soát nạp tiền', icon: 'bi-credit-card' },
    { to: '/admin/refunds', label: 'Hoàn tiền khóa học', icon: 'bi-arrow-return-left' },
    { to: '/admin/promotions', label: 'Mã giảm giá', icon: 'bi-ticket-perforated' },
  ]},
  { id: 'catalog', label: 'Nội dung & sản phẩm', icon: 'bi-journal-richtext', items: [
    { to: '/admin/catalog', label: 'Khóa học & gói giá', icon: 'bi-tags' },
    { to: '/admin/reviews', label: 'Duyệt sách', icon: 'bi-journal-check' },
  ]},
]
const expanded = reactive<Record<string, boolean>>({})
const itemActive = (to: string) => route.path === to || (to !== '/admin/dashboard' && route.path.startsWith(`${to}/`))
const groupActive = (group: typeof groups[number]) => group.items.some(item => itemActive(item.to))
watch(() => route.path, () => groups.forEach(group => { if (groupActive(group)) expanded[group.id] = true }), { immediate: true })
</script>

<template>
  <aside id="admin-sidebar" class="admin-sidebar" :class="{ open: isOpen }" aria-label="Điều hướng quản trị" @keydown.esc="emit('close')">
    <header class="sidebar-brand">
      <span class="brand-mark"><i class="bi bi-torii-gate"></i></span>
      <span><strong>Nihongo</strong><small>Quản trị hệ thống</small></span>
      <button type="button" class="sidebar-close" aria-label="Đóng menu" @click="emit('close')"><i class="bi bi-x-lg"></i></button>
    </header>
    <nav class="sidebar-nav">
      <RouterLink to="/admin/dashboard" class="overview-link" @click="emit('close')"><i class="bi bi-grid-1x2"></i><span>Tổng quan</span></RouterLink>
      <section v-for="group in groups" :key="group.id" class="nav-group">
        <button type="button" class="group-button" :class="{ active: groupActive(group) }" :aria-expanded="Boolean(expanded[group.id])" @click="expanded[group.id] = !expanded[group.id]">
          <i class="bi" :class="group.icon"></i><span>{{ group.label }}</span><i class="bi chevron" :class="expanded[group.id] ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
        </button>
        <ul v-if="expanded[group.id]" class="group-children">
          <li v-for="item in group.items" :key="item.to"><RouterLink :to="item.to" :class="{ active: itemActive(item.to) }" @click="emit('close')"><i class="bi" :class="item.icon"></i><span>{{ item.label }}</span></RouterLink></li>
        </ul>
      </section>
      <div class="account-wrap"><AccountMenu @navigate="emit('close')" /></div>
    </nav>
    <footer class="sidebar-footer"><i class="bi bi-shield-check"></i><span>Không gian quản trị an toàn</span></footer>
  </aside>
  <button v-if="isOpen" type="button" class="sidebar-backdrop" aria-label="Đóng menu" @click="emit('close')"></button>
</template>

<style scoped>
.admin-sidebar { position: fixed; inset: 0 auto 0 0; z-index: 1040; display: flex; flex-direction: column; width: var(--workspace-sidebar); overflow-y: auto; background: linear-gradient(180deg,#132238,#172b45); color: #fff; box-shadow: 8px 0 28px rgba(15,23,42,.12); }
.sidebar-brand { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 11px; min-height: var(--workspace-navbar); padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,.08); background: rgba(19,34,56,.96); backdrop-filter: blur(12px); }
.brand-mark { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; background: linear-gradient(135deg,#f7c65f,#df9631); color: #172235; font-size: 19px; }
.sidebar-brand > span:nth-child(2) { display: flex; flex: 1; flex-direction: column; line-height: 1.25; }.sidebar-brand strong { font-size: 15px; }.sidebar-brand small { color: #9fb0c5; font-size: 10px; letter-spacing: .03em; }
.sidebar-close { display: none; border: 0; background: transparent; color: #d7e1ed; }
.sidebar-nav { flex: 1; padding: 14px 12px; }.overview-link,.group-button,.group-children a { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; color: #c7d3e1; text-decoration: none; text-align: left; }
.overview-link,.group-button { min-height: 44px; padding: 9px 11px; border-radius: 10px; background: transparent; font-size: 13px; font-weight: 650; }.overview-link > i,.group-button > i:first-child { display: grid; place-items: center; width: 24px; font-size: 16px; }.group-button > span { flex: 1; }.chevron { color: #7890aa; font-size: 10px; }
.overview-link:hover,.overview-link.router-link-active,.group-button:hover,.group-button.active { background: rgba(255,255,255,.09); color: #fff; }.overview-link.router-link-active { box-shadow: inset 3px 0 #f0b84e; }
.nav-group { margin-top: 5px; }.group-children { margin: 3px 0 8px 23px; padding: 2px 0 2px 11px; list-style: none; border-left: 1px solid rgba(255,255,255,.12); }.group-children a { min-height: 38px; padding: 7px 9px; border-radius: 8px; font-size: 11px; line-height: 1.35; }.group-children a i { width: 17px; color: #8fa4bb; font-size: 13px; }.group-children a:hover,.group-children a.active { background: rgba(255,255,255,.08); color: #fff; }.group-children a.active { color: #ffd783; }
.account-wrap { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.08); }.account-wrap :deep(.account-parent) { color: #c7d3e1; font-size: 13px; font-weight: 650; }.account-wrap :deep(.account-parent:hover),.account-wrap :deep(.account-parent.selected) { background: rgba(255,255,255,.09); color: #fff; }.account-wrap :deep(.account-children) { border-color: rgba(255,255,255,.12); }.account-wrap :deep(.account-children a) { color: #b9c8d8; }.account-wrap :deep(.account-children a:hover),.account-wrap :deep(.account-children a.router-link-exact-active) { background: rgba(255,255,255,.08); color: #ffd783; }
.sidebar-footer { display: flex; align-items: center; gap: 8px; padding: 14px 18px; border-top: 1px solid rgba(255,255,255,.08); color: #8fa4bb; font-size: 10px; }.sidebar-backdrop { display: none; }
@media (max-width:768px) { .admin-sidebar { width: min(var(--workspace-sidebar),86vw); visibility: hidden; transform: translateX(-100%); transition: transform .2s,visibility .2s; }.admin-sidebar.open { visibility: visible; transform: translateX(0); }.sidebar-close { display: grid; place-items: center; width: 34px; height: 34px; }.sidebar-backdrop { position: fixed; inset: 0; z-index: 1030; display: block; border: 0; background: rgba(15,23,42,.46); backdrop-filter: blur(2px); } }
</style>
