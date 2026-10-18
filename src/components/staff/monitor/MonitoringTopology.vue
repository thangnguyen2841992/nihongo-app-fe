<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { listVps, type MonitorVps } from '@/monitor/monitorVpsService'
import {
  targetKind,
  targetKinds,
  targetStatus,
  topologyLayout,
  type Position,
} from '@/monitor/topology'
const TargetCreateDialog = defineAsyncComponent(() => import('./TargetCreateDialog.vue'))
const creating = ref(false)
const createdNotice = ref('')
function openCreateDialog() {
  closeContextMenu()
  createdNotice.value = ''
  creating.value = true
}
function closeCreateDialog() {
  creating.value = false
  void nextTick(() => viewport.value?.focus({ preventScroll: true }))
}
async function targetRegistered(target: { vpsId: number }) {
  closeCreateDialog()
  createdNotice.value = 'Đã tạo target thành công.'
  search.value = ''
  kind.value = ''
  status.value = ''
  request?.abort()
  loading.value = false
  await refresh()
  if (disposed) return
  selectedId.value = targets.value.some((row) => row.vpsId === target.vpsId) ? target.vpsId : null
  await nextTick()
  fit()
}

const targets = ref<MonitorVps[]>([])
const search = ref(''),
  kind = ref(''),
  status = ref(''),
  error = ref('')
const loading = ref(false),
  loaded = ref(false),
  updated = ref('')
const selectedId = ref<number | null>(null)
const selected = computed(() => targets.value.find((target) => target.vpsId === selectedId.value))
const positions = ref(new Map<number, Position>())
const expandedTypes = ref(new Set<string>())
const treeVisible = ref(true)
const matching = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return targets.value.filter(
    (target) =>
      (!status.value || targetStatus(target) === status.value) &&
      (!query ||
        `${target.hostname} ${target.ipAddress} ${target.agentPort} ${targetKind(target).label}`
          .toLocaleLowerCase()
          .includes(query)),
  )
})
const visible = computed(() =>
  matching.value.filter((target) => !kind.value || targetKind(target).key === kind.value),
)
const treeGroups = computed(() =>
  targetKinds
    .filter(
      (type) =>
        type.key !== 'OTHER' || targets.value.some((target) => targetKind(target).key === 'OTHER'),
    )
    .map((type) => ({
      ...type,
      targets: matching.value.filter((target) => targetKind(target).key === type.key),
    })),
)
function chooseType(key: string) {
  kind.value = key
  expandedTypes.value.add(key)
  void nextTick(fit)
}
function toggleType(key: string) {
  if (expandedTypes.value.has(key)) expandedTypes.value.delete(key)
  else expandedTypes.value.add(key)
}
async function locateTarget(target: MonitorVps) {
  kind.value = targetKind(target).key
  selectedId.value = target.vpsId
  await nextTick()
  const node = layout.value.nodes.find((node) => node.target.vpsId === target.vpsId)
  if (!node) return
  const scale = Math.max(0.8, camera.value.scale)
  camera.value = {
    scale,
    x: (viewport.value?.clientWidth || 900) / 2 - node.x * scale,
    y: (viewport.value?.clientHeight || 600) / 2 - node.y * scale,
  }
}
const columns = ref(3)
const layout = computed(() => topologyLayout(visible.value, positions.value, columns.value))
const counts = computed(() => ({
  UP: targets.value.filter((target) => targetStatus(target) === 'UP').length,
  DOWN: targets.value.filter((target) => targetStatus(target) === 'DOWN').length,
  UNKNOWN: targets.value.filter((target) => targetStatus(target) === 'UNKNOWN').length,
}))
const viewport = ref<HTMLDivElement>()
const contextMenu = ref<{ x: number; y: number } | null>(null)
const contextMenuElement = ref<HTMLDivElement>()
function closeContextMenu() {
  contextMenu.value = null
}
async function openContextMenu(event: MouseEvent) {
  if (!viewport.value) return
  const bounds = viewport.value.getBoundingClientRect()
  contextMenu.value = {
    x: Math.max(8, Math.min(event.clientX - bounds.left, (bounds.width || 900) - 224)),
    y: Math.max(8, Math.min(event.clientY - bounds.top, (bounds.height || 600) - 108)),
  }
  await nextTick()
  contextMenuElement.value
    ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
    ?.focus({ preventScroll: true })
}
function dismissContextMenu(event: PointerEvent) {
  if (contextMenu.value && !contextMenuElement.value?.contains(event.target as Node))
    closeContextMenu()
}
function contextKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && contextMenu.value) {
    event.preventDefault()
    closeContextMenu()
    viewport.value?.focus({ preventScroll: true })
  }
}
const camera = ref({ x: 0, y: 0, scale: 1 })
const transform = computed(
  () => `translate(${camera.value.x}px, ${camera.value.y}px) scale(${camera.value.scale})`,
)
let request: AbortController | undefined, timer: ReturnType<typeof setInterval> | undefined
let resize: ResizeObserver | undefined,
  disposed = false,
  fitted = false
let drag:
  | { id: number; target?: number; x: number; y: number; start: Position; moved: boolean }
  | undefined
let ignoreClick = false
function fit() {
  const width = viewport.value?.clientWidth || 900,
    height = viewport.value?.clientHeight || 600
  const scale = Math.max(
    0.15,
    Math.min(1.2, (width - 40) / layout.value.width, (height - 40) / layout.value.height),
  )
  camera.value = {
    x: (width - layout.value.width * scale) / 2 - layout.value.minX * scale,
    y: (height - layout.value.height * scale) / 2 - layout.value.minY * scale,
    scale,
  }
}
function zoom(factor: number) {
  const current = camera.value,
    scale = Math.max(0.15, Math.min(2, current.scale * factor))
  const x = (viewport.value?.clientWidth || 900) / 2,
    y = (viewport.value?.clientHeight || 600) / 2
  camera.value = {
    x: x - ((x - current.x) * scale) / current.scale,
    y: y - ((y - current.y) * scale) / current.scale,
    scale,
  }
}
function wheelZoom(event: WheelEvent) {
  closeContextMenu()
  zoom(event.deltaY > 0 ? 0.9 : 1.1)
}
function reset() {
  closeContextMenu()
  positions.value = new Map()
  fit()
}
function pointerDown(event: PointerEvent) {
  if (event.button !== 0 || !viewport.value) return
  if (contextMenuElement.value?.contains(event.target as Node)) return
  const element = (event.target as Element).closest<HTMLElement>('[data-target-id]')
  const target = element ? Number(element.dataset.targetId) : undefined
  const node = layout.value.nodes.find((node) => node.target.vpsId === target)
  drag = {
    id: event.pointerId,
    target,
    x: event.clientX,
    y: event.clientY,
    start: node ? { x: node.x, y: node.y } : { x: camera.value.x, y: camera.value.y },
    moved: false,
  }
  ignoreClick = false
  viewport.value.setPointerCapture(event.pointerId)
}
function pointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const dx = event.clientX - drag.x,
    dy = event.clientY - drag.y
  if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true
  if (!drag.moved) return
  if (drag.target !== undefined)
    positions.value.set(drag.target, {
      x: drag.start.x + dx / camera.value.scale,
      y: drag.start.y + dy / camera.value.scale,
    })
  else {
    camera.value.x = drag.start.x + dx
    camera.value.y = drag.start.y + dy
  }
}
function pointerUp(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return
  ignoreClick = drag.moved
  if (!drag.moved && drag.target !== undefined) selectedId.value = drag.target
  if (viewport.value?.hasPointerCapture(event.pointerId))
    viewport.value.releasePointerCapture(event.pointerId)
  drag = undefined
}
function select(id: number, keyboard = false) {
  if (keyboard || !ignoreClick) selectedId.value = id
  ignoreClick = false
}
function keyboardPan(event: KeyboardEvent) {
  if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
    event.preventDefault()
    const bounds = viewport.value?.getBoundingClientRect()
    if (bounds)
      void openContextMenu(
        new MouseEvent('contextmenu', {
          clientX: bounds.left + bounds.width / 2,
          clientY: bounds.top + bounds.height / 2,
        }),
      )
    return
  }
  if (event.target !== viewport.value) return
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [40, 0],
    ArrowRight: [-40, 0],
    ArrowUp: [0, 40],
    ArrowDown: [0, -40],
  }
  const move = moves[event.key]
  if (move) {
    event.preventDefault()
    camera.value.x += move[0]
    camera.value.y += move[1]
  }
}
function seen(value?: string) {
  if (!value) return 'Chưa có lần đo thành công'
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
  return Number.isNaN(date.valueOf()) ? 'Chưa có thời gian hợp lệ' : date.toLocaleString('vi-VN')
}
async function refresh() {
  if (loading.value || disposed || document.hidden) return
  loading.value = true
  error.value = ''
  const controller = new AbortController()
  request = controller
  try {
    const rows = await listVps(controller.signal)
    if (controller.signal.aborted || disposed) return
    targets.value = rows
    loaded.value = true
    updated.value = new Date().toLocaleTimeString('vi-VN')
    const ids = new Set(rows.map((row) => row.vpsId))
    for (const id of positions.value.keys()) if (!ids.has(id)) positions.value.delete(id)
    if (selectedId.value !== null && !ids.has(selectedId.value)) selectedId.value = null
    if (!fitted) {
      fit()
      fitted = true
    }
  } catch (cause) {
    if (!controller.signal.aborted && !disposed)
      error.value = 'Chưa tải được trạng thái target. Vui lòng thử lại.'
  } finally {
    if (!controller.signal.aborted && !disposed) loading.value = false
  }
}
onMounted(() => {
  void refresh()
  timer = setInterval(refresh, 30000)
  window.addEventListener('focus', refresh)
  document.addEventListener('visibilitychange', refresh)
  document.addEventListener('pointerdown', dismissContextMenu)
  document.addEventListener('keydown', contextKeydown)
  window.addEventListener('blur', closeContextMenu)
  if (typeof ResizeObserver !== 'undefined' && viewport.value) {
    resize = new ResizeObserver(() => {
      closeContextMenu()
      columns.value = (viewport.value?.clientWidth || 900) < 600 ? 2 : 3
      fit()
    })
    resize.observe(viewport.value)
  }
})
onBeforeUnmount(() => {
  disposed = true
  request?.abort()
  clearInterval(timer)
  resize?.disconnect()
  window.removeEventListener('focus', refresh)
  document.removeEventListener('visibilitychange', refresh)
  document.removeEventListener('pointerdown', dismissContextMenu)
  document.removeEventListener('keydown', contextKeydown)
  window.removeEventListener('blur', closeContextMenu)
})
</script>

<template>
  <section class="topology-page">
    <header class="topology-heading">
      <div>
        <p class="eyebrow">GIÁM SÁT HỆ THỐNG</p>
        <h1>Topology tổng quan</h1>
        <p>Mỗi biểu tượng là một target. Chọn để xem chi tiết, kéo để sắp xếp bản đồ.</p>
      </div>
      <button type="button" class="primary-link" @click="openCreateDialog">
        <i class="bi bi-plus-lg" aria-hidden="true"></i> Tạo target
      </button>
    </header>
    <div class="overview" aria-label="Tổng quan trạng thái">
      <div>
        <span>Tổng target</span><strong>{{ targets.length }}</strong>
      </div>
      <div class="up">
        <span>Đang hoạt động · UP</span><strong>{{ counts.UP }}</strong>
      </div>
      <div class="down">
        <span>Mất kết nối · DOWN</span><strong>{{ counts.DOWN }}</strong>
      </div>
      <div class="unknown">
        <span>Chưa xác định</span><strong>{{ counts.UNKNOWN }}</strong>
      </div>
    </div>
    <div class="filters">
      <label
        >Tìm target<input
          v-model="search"
          type="search"
          placeholder="Tên, địa chỉ hoặc cổng…" /></label
      ><label
        >Trạng thái<select v-model="status" aria-label="Trạng thái">
          <option value="">Tất cả trạng thái</option>
          <option value="UP">UP</option>
          <option value="DOWN">DOWN</option>
          <option value="UNKNOWN">Chưa xác định</option>
        </select></label
      ><button :disabled="loading" type="button" @click="refresh">
        {{ loading ? 'Đang cập nhật…' : 'Làm mới' }}
      </button>
    </div>
    <p v-if="createdNotice" role="status" class="create-notice">{{ createdNotice }}</p>
    <p v-if="error" role="alert" class="load-error">
      {{ error }} <button type="button" :disabled="loading" @click="refresh">Thử lại</button
      ><span v-if="loaded"> Bản đồ đang giữ dữ liệu lần cập nhật trước.</span>
    </p>
    <div class="map-layout" :class="{ 'with-detail': selected, 'tree-hidden': !treeVisible }">
      <nav
        v-show="treeVisible"
        id="topology-type-tree"
        class="type-tree"
        aria-label="Cây loại target"
      >
        <header>
          <i class="bi bi-diagram-3" aria-hidden="true"></i><strong>Target theo Type</strong>
        </header>
        <button
          type="button"
          class="tree-all"
          :class="{ active: !kind }"
          :aria-pressed="!kind"
          @click="chooseType('')"
        >
          <i class="bi bi-grid" aria-hidden="true"></i><span>Tất cả target</span
          ><small>{{ matching.length }}</small>
        </button>
        <ul class="tree-types">
          <li v-for="group in treeGroups" :key="group.key">
            <div class="tree-type-row" :class="{ active: kind === group.key }">
              <button
                type="button"
                class="tree-toggle"
                :aria-label="`${expandedTypes.has(group.key) ? 'Thu gọn' : 'Mở rộng'} ${group.label}`"
                :aria-expanded="expandedTypes.has(group.key)"
                :aria-controls="`type-children-${group.key}`"
                @click="toggleType(group.key)"
              >
                <i
                  class="bi"
                  :class="expandedTypes.has(group.key) ? 'bi-chevron-down' : 'bi-chevron-right'"
                  aria-hidden="true"
                ></i>
              </button>
              <button
                type="button"
                class="tree-type"
                :data-type="group.key"
                :aria-pressed="kind === group.key"
                @click="chooseType(group.key)"
              >
                <i class="bi" :class="group.icon" aria-hidden="true"></i
                ><span>{{ group.label }}</span
                ><small>{{ group.targets.length }}</small>
              </button>
            </div>
            <ul
              v-show="expandedTypes.has(group.key)"
              :id="`type-children-${group.key}`"
              class="tree-targets"
            >
              <li v-for="target in group.targets" :key="target.vpsId">
                <button
                  type="button"
                  :class="{ active: selectedId === target.vpsId }"
                  :title="target.hostname"
                  @click="locateTarget(target)"
                >
                  <i
                    class="legend-dot"
                    :class="targetStatus(target).toLowerCase()"
                    aria-hidden="true"
                  ></i
                  ><span>{{ target.hostname }}</span>
                </button>
              </li>
              <li v-if="!group.targets.length" class="tree-empty">Chưa có target phù hợp</li>
            </ul>
          </li>
        </ul>
      </nav>
      <section class="map-card" aria-label="Bản đồ topology">
        <div class="map-toolbar">
          <span>{{ visible.length }} / {{ targets.length }} target</span>
          <div>
            <button
              type="button"
              :aria-expanded="treeVisible"
              aria-controls="topology-type-tree"
              @click="treeVisible = !treeVisible"
            >
              <i class="bi bi-layout-sidebar" aria-hidden="true"></i>
              {{ treeVisible ? 'Ẩn cây Type' : 'Hiện cây Type' }}
            </button>
            <button type="button" aria-label="Thu nhỏ" @click="zoom(0.8)">−</button
            ><output aria-label="Mức thu phóng">{{ Math.round(camera.scale * 100) }}%</output
            ><button type="button" aria-label="Phóng to" @click="zoom(1.25)">+</button
            ><button type="button" @click="fit">Vừa màn hình</button
            ><button type="button" @click="reset">Xếp lại</button>
          </div>
        </div>
        <div
          ref="viewport"
          class="map-viewport"
          tabindex="0"
          role="region"
          aria-label="Bản đồ tương tác, dùng phím mũi tên để di chuyển"
          @pointerdown="pointerDown"
          @pointermove="pointerMove"
          @pointerup="pointerUp"
          @pointercancel="drag = undefined"
          @keydown="keyboardPan"
          @contextmenu.prevent.stop="openContextMenu"
          @wheel.prevent="wheelZoom"
        >
          <p v-if="!loaded && loading" class="map-empty" role="status">Đang tải topology…</p>
          <div v-else-if="loaded && !targets.length" class="map-empty">
            <i class="bi bi-diagram-3" aria-hidden="true"></i>
            <p>Chưa có target để hiển thị.</p>
            <button type="button" @pointerdown.stop @click="openCreateDialog">
              Tạo target đầu tiên
            </button>
          </div>
          <p v-else-if="loaded && !visible.length" class="map-empty">
            Không có target phù hợp bộ lọc.
          </p>
          <div
            v-else-if="visible.length"
            class="map-world"
            :style="{ width: `${layout.width}px`, height: `${layout.height}px`, transform }"
          >
            <button
              v-for="node in layout.nodes"
              :key="node.target.vpsId"
              type="button"
              class="target-node"
              :class="[
                targetStatus(node.target).toLowerCase(),
                { selected: selectedId === node.target.vpsId },
              ]"
              :data-target-id="node.target.vpsId"
              :style="{ left: `${node.x}px`, top: `${node.y}px` }"
              :aria-label="`${node.target.hostname}, ${targetKind(node.target).label}, ${targetStatus(node.target)}`"
              :aria-pressed="selectedId === node.target.vpsId"
              :title="`${node.target.hostname} · ${node.target.ipAddress}:${node.target.agentPort}`"
              @click="select(node.target.vpsId, $event.detail === 0)"
            >
              <span class="target-circle"
                ><i
                  class="bi target-icon"
                  :class="targetKind(node.target).icon"
                  aria-hidden="true"
                ></i
                ><span class="state-dot" :title="targetStatus(node.target)"></span
              ></span>
              <strong class="target-name">{{ node.target.hostname }}</strong>
              <span class="node-state">{{ targetStatus(node.target) }}</span>
            </button>
          </div>
          <div
            v-if="contextMenu"
            ref="contextMenuElement"
            class="map-context-menu"
            role="menu"
            aria-label="Thao tác topology"
            :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
            @contextmenu.prevent.stop
            @wheel.prevent.stop
          >
            <button type="button" role="menuitem" :disabled="!visible.length" @click="reset">
              <i class="bi bi-bounding-box" aria-hidden="true"></i>Sắp xếp tự động
            </button>
            <button type="button" role="menuitem" @click="openCreateDialog">
              <i class="bi bi-plus-circle" aria-hidden="true"></i>Tạo target
            </button>
          </div>
        </div>
        <footer class="map-footer">
          <span
            ><i class="legend-dot up"></i> UP <i class="legend-dot down"></i> DOWN
            <i class="legend-dot unknown"></i> Chưa xác định</span
          ><small>Tự cập nhật 30 giây{{ updated ? ` · Lần cuối ${updated}` : '' }}</small>
        </footer>
      </section>
      <aside v-if="selected" class="target-detail" aria-label="Chi tiết target">
        <button
          type="button"
          class="close-detail"
          aria-label="Đóng chi tiết"
          @click="selectedId = null"
        >
          ×
        </button>
        <div class="detail-icon">
          <i class="bi" :class="targetKind(selected).icon" aria-hidden="true"></i>
        </div>
        <p class="eyebrow">{{ targetKind(selected).label }}</p>
        <h2>{{ selected.hostname }}</h2>
        <span class="status-badge" :class="targetStatus(selected).toLowerCase()">{{
          targetStatus(selected)
        }}</span>
        <dl>
          <dt>Địa chỉ</dt>
          <dd>{{ selected.ipAddress }}</dd>
          <dt>Cổng</dt>
          <dd>{{ selected.agentPort }}</dd>
          <dt>Hệ điều hành / loại</dt>
          <dd>{{ selected.osType || targetKind(selected).label }}</dd>
          <dt>Lần đo thành công gần nhất</dt>
          <dd>{{ seen(selected.lastSeenAt) }}</dd>
        </dl>
        <RouterLink
          class="primary-link"
          :to="`/staff/monitoring/vps/performance?vps=${selected.vpsId}`"
          >Xem hiệu năng</RouterLink
        ><RouterLink class="detail-link" :to="`/staff/monitoring/vps/events?vps=${selected.vpsId}`"
          >Cấu hình cảnh báo</RouterLink
        >
      </aside>
    </div>
    <p class="map-note">
      Chọn Type để lọc, kéo icon để di chuyển. Chuột phải trên map → Sắp xếp tự động để đưa các
      target về giữa.
    </p>
    <TargetCreateDialog v-if="creating" @close="closeCreateDialog" @registered="targetRegistered" />
  </section>
</template>

<style scoped>
.topology-page {
  color: #21364e;
  min-width: 0;
}
.topology-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 1.5px;
  font-weight: 750;
  color: #68849e;
  margin: 0 0 7px;
}
.topology-heading h1 {
  font-size: 27px;
  font-weight: 750;
  margin: 0 0 7px;
}
.topology-heading p:last-child {
  font-size: 13px;
  color: #73869a;
  margin: 0;
}
.primary-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 15px;
  background: #216d98;
  color: white;
  border-radius: 10px;
  text-decoration: none;
  font-size: 12px;
  white-space: nowrap;
  border: 0;
}
.create-notice {
  padding: 12px 16px;
  border-radius: 10px;
  background: #ecf9f1;
  color: #23664e;
  font-size: 13px;
}
.overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}
.overview > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #e2e9ef;
  border-radius: 13px;
  padding: 17px;
}
.overview span {
  font-size: 12px;
}
.overview strong {
  font-size: 27px;
}
.up {
  color: #14815b;
}
.down {
  color: #c03b48;
}
.unknown {
  color: #778494;
}
.filters {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filters label {
  display: grid;
  gap: 6px;
  font-size: 11px;
  font-weight: 650;
}
.filters label:first-child {
  flex: 1;
  min-width: 170px;
}
.filters input,
.filters select {
  padding: 10px 12px;
  border: 1px solid #d7e1e9;
  border-radius: 9px;
  background: white;
  color: #21364e;
  font: inherit;
  min-height: 40px;
}
.filters button,
.map-toolbar button,
.load-error button {
  border: 1px solid #c9d8e3;
  border-radius: 8px;
  background: white;
  color: #315772;
  padding: 9px 12px;
  font-size: 11px;
}
button:disabled {
  opacity: 0.55;
  cursor: default;
}
.map-layout {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 16px;
}
.map-layout.with-detail {
  grid-template-columns: 210px minmax(0, 1fr) 250px;
}
.map-layout.tree-hidden {
  grid-template-columns: minmax(0, 1fr);
}
.map-layout.tree-hidden.with-detail {
  grid-template-columns: minmax(0, 1fr) 250px;
}
.map-card {
  background: white;
  border: 1px solid #dce6ee;
  border-radius: 15px;
  overflow: hidden;
  min-width: 0;
}
.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 15px;
  border-bottom: 1px solid #e6edf2;
  font-size: 11px;
}
.map-toolbar > div {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}
.map-toolbar output {
  min-width: 38px;
  text-align: center;
  color: #74889a;
}
.map-toolbar button {
  padding: 6px 9px;
}
.map-viewport {
  position: relative;
  height: 600px;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  background-color: #f8fbfd;
  background-image: radial-gradient(#cfdee8 1px, transparent 1px);
  background-size: 18px 18px;
}
.map-viewport:active {
  cursor: grabbing;
}
.map-world {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
}
.map-context-menu {
  position: absolute;
  z-index: 10;
  width: 216px;
  padding: 6px;
  border: 1px solid #d5e2ec;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 28px #173f5b26;
  cursor: default;
}
.map-context-menu :is(button, a) {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #315772;
  font-size: 12px;
  text-align: left;
  text-decoration: none;
}
.map-context-menu :is(button, a):hover,
.map-context-menu :is(button, a):focus-visible {
  background: #eaf4fb;
}
.target-node {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 150px;
  height: 136px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 3px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  text-align: center;
  cursor: grab;
  user-select: none;
}
.target-node:active {
  cursor: grabbing;
}
.target-circle {
  position: relative;
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border: 2px solid currentColor;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 15px #173f5b12;
}
.target-node.up .target-circle {
  background: #effbf5;
}
.target-node.down .target-circle {
  background: #fff2f3;
}
.target-node.unknown .target-circle {
  background: #f0f4f8;
}
.target-node:hover .target-circle,
.target-node.selected .target-circle {
  outline: 4px solid #91bfd74d;
  box-shadow: 0 5px 18px #216d9829;
}
.target-icon {
  font-size: 30px;
}
.target-name {
  max-width: 100%;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.35;
  color: #243e55;
}
.state-dot,
.legend-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.target-circle .state-dot {
  position: absolute;
  bottom: 0;
  right: 3px;
  width: 13px;
  height: 13px;
  border: 2px solid white;
}
.node-state {
  font-size: 8px;
  letter-spacing: 0.6px;
  font-weight: 750;
}
.type-tree {
  background: white;
  border: 1px solid #dce6ee;
  border-radius: 15px;
  padding: 14px 10px;
  align-self: start;
  max-height: 700px;
  overflow: auto;
  min-width: 0;
}
.type-tree header {
  display: flex;
  gap: 9px;
  align-items: center;
  padding: 3px 8px 16px;
  font-size: 12px;
}
.type-tree ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.type-tree button {
  color: #4b657d;
  border: 0;
  background: transparent;
  font-size: 11px;
}
.tree-all,
.tree-type-row,
.tree-type,
.tree-targets button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
}
.tree-all {
  padding: 10px 9px;
  margin-bottom: 8px;
  border-radius: 8px;
}
.tree-all span,
.tree-type span {
  flex: 1;
}
.type-tree small {
  background: #eff4f8;
  border-radius: 10px;
  padding: 1px 6px;
  color: #6b8196;
  font-size: 10px;
}
.tree-type-row {
  gap: 0;
  border-radius: 8px;
  min-height: 38px;
}
.type-tree .active {
  background: #eaf4fb;
  color: #216d98;
}
.tree-toggle {
  padding: 10px 5px;
  font-size: 9px !important;
}
.tree-type {
  padding: 10px 6px 10px 3px;
  min-width: 0;
}
.tree-type > i {
  font-size: 14px;
}
.type-tree button:hover {
  background: #f0f6fa;
  border-radius: 7px;
}
.tree-targets {
  margin: 2px 0 7px 12px !important;
  padding-left: 8px !important;
  border-left: 1px solid #dfe8ef;
}
.tree-targets button {
  gap: 7px;
  padding: 8px;
  border-radius: 7px;
}
.tree-targets button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-targets .legend-dot {
  margin: 0;
}
.tree-empty {
  font-size: 10px;
  color: #8a9bac;
  padding: 8px;
}
.map-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 10px;
  color: #8393a2;
  padding: 12px 15px;
  border-top: 1px solid #e6edf2;
}
.legend-dot {
  margin: 0 3px 0 9px;
}
.legend-dot:first-child {
  margin-left: 0;
}
.map-note {
  font-size: 11px;
  line-height: 1.6;
  color: #8596a6;
  margin: 12px 0;
}
.map-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #758b9e;
  font-size: 13px;
  padding: 20px;
  text-align: center;
}
.map-empty > i {
  font-size: 36px;
}
.map-empty a {
  color: #216d98;
}
.target-detail {
  position: relative;
  border: 1px solid #dce6ee;
  border-radius: 15px;
  background: white;
  padding: 24px 20px;
  align-self: start;
  min-width: 0;
}
.close-detail {
  position: absolute;
  right: 9px;
  top: 7px;
  background: none;
  border: 0;
  font-size: 24px;
  color: #6c8295;
}
.detail-icon {
  width: 52px;
  height: 52px;
  background: #eaf3f9;
  color: #216d98;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 28px;
  margin-bottom: 20px;
}
.target-detail h2 {
  font-size: 18px;
  overflow-wrap: anywhere;
  line-height: 1.4;
}
.status-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 750;
  border: 1px solid currentColor;
  border-radius: 20px;
  padding: 4px 10px;
}
.target-detail dl {
  margin: 23px 0;
  font-size: 12px;
}
.target-detail dt {
  color: #8596a6;
  font-size: 10px;
  font-weight: 500;
  margin-top: 15px;
}
.target-detail dd {
  margin: 4px 0;
  overflow-wrap: anywhere;
}
.target-detail .primary-link {
  display: flex;
}
.detail-link {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #216d98;
  margin-top: 14px;
}
.load-error {
  background: #fff4ec;
  border-radius: 10px;
  padding: 12px;
  color: #a35c25;
  font-size: 12px;
}
:is(button, a, input, select, .map-viewport):focus-visible {
  outline: 3px solid #7eb8dc;
  outline-offset: 3px;
}
@media (max-width: 1250px) {
  .map-layout.with-detail {
    grid-template-columns: 210px minmax(0, 1fr);
  }
  .map-layout.tree-hidden.with-detail {
    grid-template-columns: minmax(0, 1fr);
  }
  .map-layout.tree-hidden .target-detail {
    grid-column: 1;
  }
  .target-detail {
    display: block;
    grid-column: 2;
  }
  .target-detail dl {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 10px;
    margin: 15px 0;
  }
  .target-detail dt {
    margin: 4px 0;
  }
  .detail-icon {
    float: left;
    margin-right: 15px;
  }
}
@media (max-width: 900px) {
  .map-layout,
  .map-layout.with-detail,
  .map-layout.tree-hidden.with-detail {
    grid-template-columns: minmax(0, 1fr);
  }
  .type-tree {
    max-height: 260px;
    width: 100%;
  }
  .target-detail {
    grid-column: 1;
  }
}
@media (max-width: 600px) {
  .topology-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .topology-heading h1 {
    font-size: 23px;
  }
  .overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }
  .overview > div {
    padding: 12px;
  }
  .overview span {
    font-size: 10px;
  }
  .overview strong {
    font-size: 22px;
  }
  .filters label:not(:first-child) {
    flex: 1;
    min-width: 120px;
  }
  .map-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
  .map-viewport {
    height: 660px;
  }
  .map-footer {
    font-size: 9px;
  }
}
</style>
