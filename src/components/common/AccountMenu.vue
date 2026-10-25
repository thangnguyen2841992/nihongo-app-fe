<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import { accountSections } from '@/services/accountSections'
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const expanded = ref(false)
const itemsId = useId()
watch(() => route.path, path => { if (path.startsWith('/account')) expanded.value = true }, { immediate: true })
</script>
<template>
  <div class="account-tree">
    <button type="button" class="account-parent" :class="{ selected: route.path.startsWith('/account/') }" :aria-expanded="expanded" :aria-controls="itemsId" @click="expanded = !expanded"><i class="bi bi-shield-lock" aria-hidden="true"></i><span>Tài khoản và bảo mật</span><i class="bi" :class="expanded ? 'bi-chevron-down' : 'bi-chevron-right'" aria-hidden="true"></i></button>
    <ul v-if="expanded" :id="itemsId" class="account-children">
      <li v-for="section in accountSections" :key="section.id"><RouterLink :to="`/account/${section.id}`" @click="emit('navigate')"><i class="bi" :class="section.icon" aria-hidden="true"></i>{{ section.label }}</RouterLink></li>
    </ul>
  </div>
</template>
<style scoped>
.account-parent { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 46px; padding: 10px 12px; border: 0; border-radius: 10px; background: transparent; color: #71647d; font-size: 12px; text-align: left; cursor: pointer; }.account-parent > span { flex: 1; }.account-parent > i:last-child { font-size: var(--learn-text-xs); }.account-parent:hover,.account-parent.selected { background: #eee6f4; color: #74568a; }
.account-children { list-style: none; margin: 4px 0 10px 20px; padding: 0 0 0 12px; border-left: 1px solid #ded3e7; }.account-children li { position: relative; }.account-children li::before { content: ''; position: absolute; width: 10px; height: 1px; left: -12px; top: 22px; background: #ded3e7; }.account-children a { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 9px 10px; border-radius: 8px; color: #83748e; text-decoration: none; font-size: var(--learn-text-xs); }.account-children a:hover { background: #f4edf8; }.account-children a.router-link-exact-active { background: #eee6f4; color: #75558a; font-weight: 650; }button:focus-visible,a:focus-visible { outline: 2px solid #b59ac7; outline-offset: 2px; }
</style>
