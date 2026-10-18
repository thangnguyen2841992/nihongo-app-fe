import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export function useWorkspaceSidebar() {
  const route = useRoute()
  const media = window.matchMedia?.('(max-width: 768px)')
  const mobile = ref(media?.matches ?? window.innerWidth <= 768)
  const desktopOpen = ref(true)
  const mobileOpen = ref(false)
  const sidebarOpen = computed(() => (mobile.value ? mobileOpen.value : desktopOpen.value))
  function toggleSidebar() {
    if (mobile.value) mobileOpen.value = !mobileOpen.value
    else desktopOpen.value = !desktopOpen.value
  }
  function closeSidebar() {
    if (mobile.value) mobileOpen.value = false
    else desktopOpen.value = false
  }
  function closeOnNavigate() {
    mobileOpen.value = false
  }
  function changeScreen() {
    mobile.value = media?.matches ?? window.innerWidth <= 768
    mobileOpen.value = false
  }
  watch(
    () => route.fullPath,
    () => {
      mobileOpen.value = false
    },
  )
  onMounted(() => media?.addEventListener?.('change', changeScreen))
  onBeforeUnmount(() => media?.removeEventListener?.('change', changeScreen))
  return { sidebarOpen, toggleSidebar, closeSidebar, closeOnNavigate }
}
