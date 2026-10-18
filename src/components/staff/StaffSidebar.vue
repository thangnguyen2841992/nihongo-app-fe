<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AccountMenu from '@/components/common/AccountMenu.vue'
import { gatewayUrl } from '@/api/authApi.ts'

interface Lesson { lessonId: number; lessonName: string }
interface Book { bookId: number; bookName: string; lessons: Lesson[] }
interface Type { typeId: number; typeName: string }
interface Level { levelId: number; levelName: string }

defineProps<{ isOpen?: boolean }>()
const emit = defineEmits<{ close: []; navigate: [] }>()
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const levels = ref<Level[]>([])
const types = ref<Type[]>([])
const expandedLevels = ref<Record<number, boolean>>({})
const expandedTypes = ref<Record<string, boolean>>({})
const booksMap = ref<Record<string, Book[]>>({})
const loadingBooks = ref<Record<string, boolean>>({})

const groups = [
  { id: 'learning', label: 'Học viên & hỗ trợ', icon: 'bi-people', items: [
    { to: '/staff/classrooms', label: 'Lớp học & giao đề', icon: 'bi-mortarboard' },
    { to: '/staff/support', label: 'Hỗ trợ trực tuyến', icon: 'bi-headset' },
    { to: '/staff/notifications', label: 'Gửi thông báo', icon: 'bi-megaphone' },
    { to: '/staff/insights', label: 'Chất lượng & học viên', icon: 'bi-graph-up' },
  ]},
  { id: 'editorial', label: 'Biên tập nội dung', icon: 'bi-pencil-square', items: [
    { to: '/staff/editorial', label: 'Báo lỗi & duyệt bài', icon: 'bi-inbox' },
    { to: '/staff/question-bank', label: 'Ngân hàng câu hỏi', icon: 'bi-ui-checks' },
    { to: '/staff/revisions', label: 'Phiên bản nội dung', icon: 'bi-clock-history' },
    { to: '/staff/create-book', label: 'Tạo sách', icon: 'bi-book-half' },
    { to: '/staff/imports/books', label: 'Nhập dữ liệu sách', icon: 'bi-cloud-arrow-up' },
  ]},
]
const monitoringItems = [
  { to: '/staff/monitoring/topology', label: 'Topology tổng quan', icon: 'bi-diagram-3' },
  { to: '/staff/monitoring/register', label: 'Đăng ký target', icon: 'bi-plus-square' },
  { to: '/staff/monitoring/vps/performance', label: 'Hiệu năng monitoring', icon: 'bi-graph-up' },
  { to: '/staff/monitoring/vps/performance?schedules=1', label: 'Lịch thu thập metric', icon: 'bi-sliders' },
  { to: '/staff/monitoring/vps/events', label: 'Event giám sát', icon: 'bi-bell' },
  { to: '/staff/monitoring/vps/events/realtime', label: 'Event realtime', icon: 'bi-broadcast' },
  { to: '/staff/monitoring/vps/events/history', label: 'Lịch sử event', icon: 'bi-clock-history' },
]
const expanded = reactive<Record<string, boolean>>({ content: true })
const cleanPath = (to: string) => to.split('?')[0] || to
const itemActive = (to: string) => route.path === cleanPath(to) && (!to.includes('schedules=1') || route.query.schedules === '1') && (to.includes('schedules=1') || !(cleanPath(to).endsWith('/performance') && route.query.schedules === '1'))
const groupActive = (items: { to: string }[]) => items.some(item => itemActive(item.to))
watch(() => route.fullPath, () => {
  groups.forEach(group => { if (groupActive(group.items)) expanded[group.id] = true })
  if (route.path.startsWith('/staff/monitoring')) expanded.monitoring = true
}, { immediate: true })
const go = async (path: string) => { await router.push(path); emit('navigate') }

onMounted(async () => {
  loading.value = true
  try {
    const [levelRes, typeRes] = await Promise.all([gatewayUrl.get('/api/staff/levels'), gatewayUrl.get('/api/staff/types')])
    levels.value = levelRes.data || []
    types.value = typeRes.data || []
  } catch (error) { console.error('Load sidebar data error:', error) }
  finally { loading.value = false }
})
const toggleType = async (levelId: number, typeId: number) => {
  const key = `${levelId}-${typeId}`
  if (booksMap.value[key]) { expandedTypes.value[key] = !expandedTypes.value[key]; return }
  loadingBooks.value[key] = true
  try {
    const response = await gatewayUrl.get('/api/staff/getBooksByLevelAndType', { params: { levelId, typeId } })
    booksMap.value[key] = response.data || []
    expandedTypes.value[key] = true
  } catch (error) { console.error('Load books error:', error) }
  finally { loadingBooks.value[key] = false }
}
</script>

<template>
  <aside id="staff-sidebar" class="staff-sidebar" :class="{ open: isOpen }" aria-label="Điều hướng nhân viên" @keydown.esc="emit('close')">
    <header class="sidebar-brand"><span class="brand-mark"><i class="bi bi-person-badge"></i></span><span><strong>Nihongo Staff</strong><small>Không gian vận hành</small></span><button type="button" class="sidebar-close" aria-label="Đóng menu" @click="emit('close')"><i class="bi bi-x-lg"></i></button></header>
    <nav class="sidebar-nav">
      <button type="button" class="top-link" :class="{ active: route.path === '/staff' }" @click="go('/staff')"><i class="bi bi-grid-1x2"></i><span>Trang chủ</span></button>
      <section v-for="group in groups" :key="group.id" class="nav-group">
        <button type="button" class="group-button" :class="{ active: groupActive(group.items) }" :aria-expanded="Boolean(expanded[group.id])" @click="expanded[group.id] = !expanded[group.id]"><i class="bi" :class="group.icon"></i><span>{{ group.label }}</span><i class="bi chevron" :class="expanded[group.id] ? 'bi-chevron-down' : 'bi-chevron-right'"></i></button>
        <ul v-if="expanded[group.id]" class="group-children"><li v-for="item in group.items" :key="item.to"><button type="button" :class="{ active: itemActive(item.to) }" @click="go(item.to)"><i class="bi" :class="item.icon"></i><span>{{ item.label }}</span></button></li></ul>
      </section>
      <section class="nav-group">
        <button type="button" class="group-button" :class="{ active: route.path.startsWith('/staff/monitoring') }" :aria-expanded="Boolean(expanded.monitoring)" @click="expanded.monitoring = !expanded.monitoring"><i class="bi bi-speedometer2"></i><span>Giám sát hệ thống</span><i class="bi chevron" :class="expanded.monitoring ? 'bi-chevron-down' : 'bi-chevron-right'"></i></button>
        <ul v-if="expanded.monitoring" class="group-children"><li v-for="item in monitoringItems" :key="item.to"><button type="button" :class="{ active: itemActive(item.to) }" @click="go(item.to)"><i class="bi" :class="item.icon"></i><span>{{ item.label }}</span></button></li></ul>
      </section>
      <section class="nav-group content-tree">
        <button type="button" class="group-button" :aria-expanded="Boolean(expanded.content)" @click="expanded.content = !expanded.content"><i class="bi bi-diagram-3"></i><span>Cây khóa học</span><i class="bi chevron" :class="expanded.content ? 'bi-chevron-down' : 'bi-chevron-right'"></i></button>
        <div v-if="expanded.content" class="course-tree">
          <div v-if="loading" class="tree-status"><span class="spinner-border spinner-border-sm"></span>Đang tải dữ liệu...</div>
          <section v-for="level in levels" :key="level.levelId" class="level-group">
            <button type="button" class="level-item" @click="expandedLevels[level.levelId] = !expandedLevels[level.levelId]"><span><i class="bi bi-mortarboard"></i>{{ level.levelName }}</span><i class="bi" :class="expandedLevels[level.levelId] ? 'bi-chevron-down' : 'bi-chevron-right'"></i></button>
            <div v-if="expandedLevels[level.levelId]" class="type-list">
              <section v-for="type in types" :key="type.typeId"><button type="button" class="type-item" @click="toggleType(level.levelId,type.typeId)"><span><i class="bi bi-tags"></i>{{ type.typeName }}</span><i class="bi" :class="expandedTypes[`${level.levelId}-${type.typeId}`] ? 'bi-chevron-down' : 'bi-chevron-right'"></i></button>
                <div v-if="expandedTypes[`${level.levelId}-${type.typeId}`]" class="book-list"><div v-if="loadingBooks[`${level.levelId}-${type.typeId}`]" class="tree-status">Đang tải sách...</div><div v-for="book in booksMap[`${level.levelId}-${type.typeId}`] || []" :key="book.bookId" class="book-group"><strong><i class="bi bi-book"></i>{{ book.bookName }}</strong><button v-for="lesson in book.lessons" :key="lesson.lessonId" type="button" class="lesson-item"><i class="bi bi-file-earmark-text"></i>{{ lesson.lessonName }}</button></div><div v-if="!loadingBooks[`${level.levelId}-${type.typeId}`] && !(booksMap[`${level.levelId}-${type.typeId}`] || []).length" class="tree-status">Chưa có sách</div></div>
              </section>
            </div>
          </section>
        </div>
      </section>
      <div class="account-wrap"><AccountMenu @navigate="emit('navigate')" /></div>
    </nav>
  </aside>
  <button v-if="isOpen" type="button" class="sidebar-backdrop" aria-label="Đóng menu" @click="emit('close')"></button>
</template>

<style scoped>
.staff-sidebar { position: fixed; inset: 0 auto 0 0; z-index: 1040; display: flex; flex-direction: column; width: var(--workspace-sidebar); overflow-y: auto; background: linear-gradient(180deg,#10243c,#173557); color:#fff; box-shadow: 8px 0 28px rgba(15,23,42,.12); scrollbar-width: thin; scrollbar-color:#526f8e transparent; }
.sidebar-brand { position: sticky; top:0; z-index:2; display:flex; align-items:center; gap:11px; min-height:var(--workspace-navbar); padding:10px 16px; border-bottom:1px solid rgba(255,255,255,.08); background:rgba(16,36,60,.96); backdrop-filter:blur(12px); }.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#69a7e7,#4077ae);font-size:18px}.sidebar-brand>span:nth-child(2){display:flex;flex:1;flex-direction:column;line-height:1.25}.sidebar-brand strong{font-size:14px}.sidebar-brand small{color:#9bb0c8;font-size:10px}.sidebar-close{display:none;border:0;background:transparent;color:#d8e3ee}
.sidebar-nav{flex:1;padding:14px 12px}.top-link,.group-button,.group-children button{display:flex;align-items:center;gap:10px;width:100%;border:0;color:#c7d5e4;text-align:left}.top-link,.group-button{min-height:44px;padding:9px 11px;border-radius:10px;background:transparent;font-size:13px;font-weight:650}.top-link>i,.group-button>i:first-child{display:grid;place-items:center;width:24px;font-size:16px}.group-button>span,.top-link>span{flex:1}.chevron{color:#7892ad;font-size:10px}.top-link:hover,.top-link.active,.group-button:hover,.group-button.active{background:rgba(255,255,255,.09);color:#fff}.top-link.active{box-shadow:inset 3px 0 #70b3f1}.nav-group{margin-top:5px}.group-children{margin:3px 0 8px 23px;padding:2px 0 2px 11px;list-style:none;border-left:1px solid rgba(255,255,255,.13)}.group-children button{min-height:38px;padding:7px 9px;border-radius:8px;background:transparent;font-size:11px;line-height:1.35}.group-children button i{width:17px;color:#8fa8c1;font-size:13px}.group-children button:hover,.group-children button.active{background:rgba(255,255,255,.08);color:#fff}.group-children button.active{color:#9cd0ff}
.content-tree{padding-top:8px;border-top:1px solid rgba(255,255,255,.08)}.course-tree{margin:5px 0 10px 10px;padding-left:10px;border-left:1px solid rgba(255,255,255,.12)}.tree-status{display:flex;align-items:center;gap:7px;padding:8px;color:#8fa8c1;font-size:10px}.level-group{margin:5px 0}.level-item,.type-item{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;border-radius:8px;color:#d7e5f2;text-align:left}.level-item{padding:8px;background:rgba(80,145,205,.15);font-size:11px;font-weight:700}.level-item span,.type-item span{display:flex;align-items:center;gap:7px}.level-item>i,.type-item>i{font-size:9px}.type-list{padding:5px 0 0 9px}.type-item{padding:7px;background:transparent;font-size:10px}.type-item:hover{background:rgba(255,255,255,.06)}.book-list{padding-left:9px}.book-group{margin:4px 0;padding:6px;border-radius:7px;background:rgba(255,255,255,.04)}.book-group strong{display:flex;gap:6px;color:#e6eef7;font-size:10px}.lesson-item{display:flex;gap:6px;width:100%;margin-top:3px;padding:5px 6px;border:0;border-radius:6px;background:transparent;color:#aebfd1;font-size:9px;text-align:left}.lesson-item:hover{background:rgba(255,255,255,.06);color:#fff}
.account-wrap{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08)}.account-wrap :deep(.account-parent){color:#c7d5e4;font-size:13px;font-weight:650}.account-wrap :deep(.account-parent:hover),.account-wrap :deep(.account-parent.selected){background:rgba(255,255,255,.09);color:#fff}.account-wrap :deep(.account-children){border-color:rgba(255,255,255,.12)}.account-wrap :deep(.account-children a){color:#b7c7d8}.account-wrap :deep(.account-children a:hover),.account-wrap :deep(.account-children a.router-link-exact-active){background:rgba(255,255,255,.08);color:#9cd0ff}.sidebar-backdrop{display:none}
@media(max-width:768px){.staff-sidebar{width:min(var(--workspace-sidebar),86vw);visibility:hidden;transform:translateX(-100%);transition:transform .2s,visibility .2s}.staff-sidebar.open{visibility:visible;transform:translateX(0)}.sidebar-close{display:grid;place-items:center;width:34px;height:34px}.sidebar-backdrop{position:fixed;inset:0;z-index:1030;display:block;border:0;background:rgba(15,23,42,.46);backdrop-filter:blur(2px)}}
</style>
