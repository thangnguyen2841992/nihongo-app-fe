<script setup lang="ts">
import { reactive, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import AccountMenu from '@/components/common/AccountMenu.vue'
import SidebarMyCourses from './SidebarMyCourses.vue'
import { navigationItemActive, userNavigationGroups } from '@/services/userNavigation'
defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: []; navigate: [] }>()
const route = useRoute(), menuId = useId()
const expanded = reactive<Record<string, boolean>>({ study: route.path === '/' })
const groupActive = (id: string) => userNavigationGroups.find(group => group.id === id)?.items.some(item => navigationItemActive(item, route.path)) || false
watch(() => route.path, () => {
  for (const group of userNavigationGroups) if (groupActive(group.id)) expanded[group.id] = true
}, { immediate: true })
</script>

<template>
  <aside id="user-sidebar" class="learning-sidebar user-sidebar" :class="{ open: isOpen }" aria-label="Menu học tập" @keydown.esc="emit('close')">
    <div class="sidebar-heading"><span>KHÔNG GIAN HỌC TẬP</span><button type="button" class="close-menu" aria-label="Đóng menu" @click="emit('close')"><i class="bi bi-x-lg" aria-hidden="true"></i></button></div>
    <nav aria-label="Điều hướng học tập">
      <RouterLink to="/" class="learning-link home-link" active-class="" exact-active-class="selected" @click="emit('navigate')"><i class="bi bi-house-heart" aria-hidden="true"></i><span>Học hôm nay</span></RouterLink>
      <div class="sidebar-groups">
        <section v-for="group in userNavigationGroups" :key="group.id" class="menu-group">
          <button type="button" class="menu-parent" :class="{ selected: groupActive(group.id) }" :aria-expanded="Boolean(expanded[group.id])" :aria-controls="`${menuId}-${group.id}`" @click="expanded[group.id] = !expanded[group.id]">
            <i class="bi group-icon" :class="group.icon" aria-hidden="true"></i><span>{{ group.label }}</span><i class="bi menu-chevron" :class="expanded[group.id] ? 'bi-chevron-down' : 'bi-chevron-right'" aria-hidden="true"></i>
          </button>
          <ul v-show="expanded[group.id]" :id="`${menuId}-${group.id}`" class="menu-children">
            <li v-for="item in group.items" :key="item.to"><RouterLink :to="item.to" class="menu-child" :class="{ selected: navigationItemActive(item, route.path) }" @click="emit('navigate')"><i class="bi" :class="item.icon" aria-hidden="true"></i><span>{{ item.label }}</span></RouterLink><SidebarMyCourses v-if="item.to === '/user/my-courses'" @navigate="emit('navigate')" /></li>
          </ul>
        </section>
        <AccountMenu @navigate="emit('navigate')" />
      </div>
      <div class="sidebar-support"><RouterLink to="/user/content-reports" class="support-link" @click="emit('navigate')"><i class="bi bi-flag" aria-hidden="true"></i><span>Báo lỗi của tôi</span></RouterLink><p>Học đều mỗi ngày, tiến bộ từng chút.</p></div>
    </nav>
  </aside>
  <button v-if="isOpen" type="button" class="sidebar-overlay" aria-label="Đóng menu" @click="emit('close')"></button>
</template>

<style scoped src="./learningSidebar.css"></style>
<style scoped>
.close-menu{display:grid;place-items:center;flex-shrink:0;width:30px;height:30px;margin-left:8px;border:1px solid #e2d7df;border-radius:7px;background:#ffffff80;color:#71647d}
.user-sidebar { padding: 22px 12px 20px; scrollbar-width: thin; scrollbar-color: #d7c8db transparent; }
.sidebar-heading { padding: 0 10px; font-size: 10px; letter-spacing: .09em; margin-bottom: 12px; }
.home-link { min-height: 48px; margin: 0 0 16px; padding: 10px; }.home-link.selected { background: linear-gradient(110deg,#ead5df,#e2d8eb); border-color: #dac3d7; color: #5d4968; font-weight: 650; }
.sidebar-groups { padding-top: 10px; border-top: 1px solid #e2d7df; }.menu-group { margin: 4px 0; }
.menu-parent { display: flex; align-items: center; gap: 9px; width: 100%; min-height: 46px; padding: 9px 10px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: #71647d; font-size: 13px; font-weight: 650; text-align: left; cursor: pointer; }
.menu-parent > span { flex: 1; line-height: 1.5; }.group-icon { display: grid; place-items: center; width: 25px; height: 25px; flex-shrink: 0; color: #98748f; font-size: 17px; }.menu-chevron { font-size: 10px; color: #a18dab; }
.menu-parent:hover,.menu-parent.selected { background: #eee5f0; color: #705582; }.menu-parent.selected .group-icon { color: #80628e; }
.menu-children { list-style: none; margin: 4px 0 12px 22px; padding: 0 0 0 10px; border-left: 1px solid #dacddd; }.menu-children li { position: relative; }.menu-children li::before { content: ''; position: absolute; width: 9px; height: 1px; left: -10px; top: 22px; background: #dacddd; }
.menu-child { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 8px; border: 1px solid transparent; border-radius: 8px; color: #84728e; text-decoration: none; font-size: 12px; line-height: 1.45; }.menu-child > i { flex-shrink: 0; color: #aa8bb1; font-size: 14px; }.menu-child:hover { background: #f0e8f3; }.menu-child.selected { background: #ece0f1; border-color: #e0d1e7; color: #73538a; font-weight: 650; }.menu-child.selected > i { color: #85609b; }
.sidebar-groups :deep(.account-parent) { gap: 9px; min-height: 48px; padding: 10px; font-weight: 600; line-height: 1.5; }.sidebar-groups :deep(.account-parent > i:first-child) { display: grid; place-items: center; width: 25px; height: 25px; flex-shrink: 0; font-size: 17px; color: #98748f; }.sidebar-groups :deep(.account-children) { margin-left: 22px; padding-left: 10px; }.sidebar-groups :deep(.account-children a) { padding: 9px 8px; }
.sidebar-support { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2d7df; }.support-link { display: flex; gap: 10px; align-items: center; min-height: 44px; padding: 10px; border-radius: 9px; color: #8d7b96; text-decoration: none; font-size: 11px; }.support-link:hover,.support-link.router-link-exact-active { background: #eee5f0; color: #705582; }.sidebar-support p { margin: 12px 10px 0; color: #ad9bb5; font-size: 10px; line-height: 1.7; }
@media(max-width:768px) { .user-sidebar { padding-top: 18px; padding-bottom: max(20px,env(safe-area-inset-bottom)); }.sidebar-heading { font-size: 10px; }.menu-parent,.home-link { font-size: 13px; }.menu-child,.support-link { font-size: 12px; }.close-menu { width: 36px; height: 36px; } }
</style>
