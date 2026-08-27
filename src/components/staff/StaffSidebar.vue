<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRouter, useRoute } from "vue-router"
import { gatewayUrl } from "@/api/authApi.ts"

/* =========================
   ROUTER
========================= */

const router = useRouter()
const route = useRoute()


/* =========================
   INTERFACES
========================= */

interface Lesson {
  lessonId: number
  lessonName: string
}

interface Book {
  bookId: number
  bookName: string
  lessons: Lesson[]
}

interface Type {
  typeId: number
  typeName: string
}

interface Level {
  levelId: number
  levelName: string
}


/* =========================
   STATE
========================= */

const showTree = ref(true)

const loading = ref(false)

const levels = ref<Level[]>([])

const types = ref<Type[]>([])

/*
 * Monitoring menu
 *
 * Tự mở nếu URL hiện tại thuộc:
 *
 * /staff/monitoring
 * /staff/monitoring/...
 */
const showMonitoring = ref(
  route.path.startsWith(
    "/staff/monitoring"
  )
)


/*
 * expand level
 */
const expandedLevels =
  ref<Record<number, boolean>>({})


/*
 * expand type
 *
 * key = levelId-typeId
 */
const expandedTypes =
  ref<Record<string, boolean>>({})


/*
 * cache books
 */
const booksMap =
  ref<Record<string, Book[]>>({})


/*
 * loading books
 */
const loadingBooks =
  ref<Record<string, boolean>>({})


/* =========================
   FETCH INITIAL DATA
========================= */

onMounted(async () => {

  loading.value = true

  try {

    const [
      levelRes,
      typeRes
    ] = await Promise.all([

      gatewayUrl.get(
        "/api/staff/levels"
      ),

      gatewayUrl.get(
        "/api/staff/types"
      )

    ])

    levels.value =
      levelRes.data || []

    types.value =
      typeRes.data || []


    levels.value.forEach(level => {

      expandedLevels.value[
        level.levelId
        ] = false

    })

  } catch (e) {

    console.error(
      "Load sidebar data error:",
      e
    )

  } finally {

    loading.value = false

  }

})


/* =========================
   NAVIGATION
========================= */

const go = (
  path: string
) => {

  router.push(path)

}


const isActive = (
  path: string
) => {

  return route.path === path

}


/* =========================
   MONITORING
========================= */

const toggleMonitoring = () => {

  showMonitoring.value =
    !showMonitoring.value

}


/*
 * Monitoring menu active
 *
 * true khi đang ở:
 *
 * /staff/monitoring
 * /staff/monitoring/vps/register
 * /staff/monitoring/...
 */
const isMonitoringActive = () => {

  return route.path.startsWith(
    "/staff/monitoring"
  )

}


/* =========================
   TREE
========================= */

const toggleTree = () => {

  showTree.value =
    !showTree.value

}


/* =========================
   LEVEL
========================= */

const toggleLevel = (
  levelId: number
) => {

  expandedLevels.value[
    levelId
    ] =
    !expandedLevels.value[
      levelId
      ]

}


const isLevelExpanded = (
  levelId: number
) => {

  return !!expandedLevels.value[
    levelId
    ]

}


/* =========================
   TYPE + LOAD BOOKS
========================= */

const toggleType = async (
  levelId: number,
  typeId: number
) => {

  const key =
    `${levelId}-${typeId}`


  /*
   * Đã load books
   */
  if (
    booksMap.value[key]
  ) {

    expandedTypes.value[key] =
      !expandedTypes.value[key]

    return

  }


  try {

    loadingBooks.value[key] =
      true


    const response =
      await gatewayUrl.get(
        "/api/staff/getBooksByLevelAndType",
        {
          params: {
            levelId,
            typeId
          }
        }
      )


    booksMap.value[key] =
      response.data || []


    expandedTypes.value[key] =
      true

  } catch (e) {

    console.error(
      "Load books error:",
      e
    )

  } finally {

    loadingBooks.value[key] =
      false

  }

}


const isTypeExpanded = (
  levelId: number,
  typeId: number
) => {

  return !!expandedTypes.value[
    `${levelId}-${typeId}`
    ]

}


/* =========================
   HELPERS
========================= */

const getBooks = (
  levelId: number,
  typeId: number
) => {

  return booksMap.value[
    `${levelId}-${typeId}`
    ] || []

}


const isBooksLoading = (
  levelId: number,
  typeId: number
) => {

  return !!loadingBooks.value[
    `${levelId}-${typeId}`
    ]

}

</script>


<template>

  <div class="sidebar">

    <!-- =========================
         HEADER
    ========================= -->

    <div class="sidebar-header">

      <h4 class="sidebar-title">

        <i
          class="
            bi bi-person-badge
            me-2
          "
        ></i>

        Nhân viên

      </h4>

    </div>


    <!-- =========================
         MENU
    ========================= -->

    <div class="sidebar-menu">


      <!-- =========================
           DASHBOARD
      ========================= -->

      <button
        class="menu-item"
        :class="{
          active:
            isActive('/staff')
        }"
        @click="
          go('/staff')
        "
      >

        <div>

          <i
            class="
              bi bi-house-door
              me-2
            "
          ></i>

          Trang chủ

        </div>

      </button>


      <!-- =========================
           MONITORING
      ========================= -->

      <div
        class="monitoring-menu"
      >

        <!-- MENU CHA -->

        <button
          class="
            menu-item
            tree-header
          "
          :class="{
            active:
              isMonitoringActive()
          }"
          @click="
            toggleMonitoring
          "
        >

          <div>

            <i
              class="
                bi bi-speedometer2
                me-2
              "
            ></i>

            Monitoring Server

          </div>


          <i
            class="bi"
            :class="
              showMonitoring
                ? 'bi-chevron-down'
                : 'bi-chevron-right'
            "
          ></i>

        </button>


        <!-- MENU CON -->

        <Transition
          name="fade"
        >

          <div
            v-if="
              showMonitoring
            "
            class="
              monitoring-submenu
            "
          >

            <!-- =================
                 MONITORING DASHBOARD
            ================== -->

            <button
              class="
                monitoring-item
              "
              :class="{
                active:
                  isActive(
                    '/staff/monitoring'
                  )
              }"
              @click="
                go(
                  '/staff/monitoring'
                )
              "
            >

              <i
                class="
                  bi bi-speedometer2
                  me-2
                "
              ></i>

              Tổng quan

            </button>


            <!-- =================
                 REGISTER VPS
            ================== -->

            <button
              class="
                monitoring-item
              "
              :class="{
                active:
                  isActive(
                    '/staff/monitoring/vps/register'
                  )
              }"
              @click="
                go(
                  '/staff/monitoring/vps/register'
                )
              "
            >

              <i
                class="
                  bi bi-server
                  me-2
                "
              ></i>

              Đăng ký VPS

            </button>

          </div>

        </Transition>

      </div>


      <!-- =========================
           CREATE BOOK
      ========================= -->

      <button
        class="menu-item"
        :class="{
          active:
            isActive(
              '/staff/create-book'
            )
        }"
        @click="
          go(
            '/staff/create-book'
          )
        "
      >

        <div>

          <i
            class="
              bi bi-book-half
              me-2
            "
          ></i>

          Tạo sách

        </div>

      </button>


      <!-- =========================
           CONTENT MANAGEMENT
      ========================= -->

      <div
        class="tree-wrapper"
      >

        <!-- TREE HEADER -->

        <button
          class="
            menu-item
            tree-header
          "
          @click="
            toggleTree
          "
        >

          <div>

            <i
              class="
                bi bi-diagram-3
                me-2
              "
            ></i>

            Quản lý nội dung

          </div>


          <i
            class="bi"
            :class="
              showTree
                ? 'bi-chevron-down'
                : 'bi-chevron-right'
            "
          ></i>

        </button>


        <!-- TREE BODY -->

        <div
          v-if="showTree"
          class="tree-body"
        >


          <!-- =================
               LOADING
          ================== -->

          <div
            v-if="loading"
            class="loading-box"
          >

            <div
              class="
                spinner-border
                spinner-border-sm
              "
            ></div>

            <span>
              Đang tải dữ liệu...
            </span>

          </div>


          <!-- =================
               LEVEL
          ================== -->

          <div
            v-for="
              level in levels
            "
            :key="
              level.levelId
            "
            class="
              level-group
            "
          >


            <!-- LEVEL HEADER -->

            <button
              class="
                level-item
              "
              @click="
                toggleLevel(
                  level.levelId
                )
              "
            >

              <div
                class="
                  level-left
                "
              >

                <i
                  class="
                    bi bi-mortarboard
                    me-2
                  "
                ></i>

                {{
                  level.levelName
                }}

              </div>


              <i
                class="bi"
                :class="
                  isLevelExpanded(
                    level.levelId
                  )
                    ? 'bi-chevron-down'
                    : 'bi-chevron-right'
                "
              ></i>

            </button>


            <!-- =================
                 TYPE
            ================== -->

            <Transition
              name="fade"
            >

              <div
                v-if="
                  isLevelExpanded(
                    level.levelId
                  )
                "
                class="
                  type-list
                "
              >

                <div
                  v-for="
                    type in types
                  "
                  :key="
                    type.typeId
                  "
                  class="
                    type-group
                  "
                >


                  <!-- TYPE -->

                  <button
                    class="
                      type-item
                    "
                    @click="
                      toggleType(
                        level.levelId,
                        type.typeId
                      )
                    "
                  >

                    <div
                      class="
                        type-left
                      "
                    >

                      <i
                        class="
                          bi bi-tags
                          me-2
                        "
                      ></i>

                      {{
                        type.typeName
                      }}

                    </div>


                    <i
                      class="bi"
                      :class="
                        isTypeExpanded(
                          level.levelId,
                          type.typeId
                        )
                          ? 'bi-chevron-down'
                          : 'bi-chevron-right'
                      "
                    ></i>

                  </button>


                  <!-- =================
                       BOOK
                  ================== -->

                  <Transition
                    name="fade"
                  >

                    <div
                      v-if="
                        isTypeExpanded(
                          level.levelId,
                          type.typeId
                        )
                      "
                      class="
                        book-list
                      "
                    >


                      <!-- LOADING BOOKS -->

                      <div
                        v-if="
                          isBooksLoading(
                            level.levelId,
                            type.typeId
                          )
                        "
                        class="
                          loading-books
                        "
                      >

                        <div
                          class="
                            spinner-border
                            spinner-border-sm
                          "
                        ></div>

                        <span>
                          Đang tải sách...
                        </span>

                      </div>


                      <!-- BOOK -->

                      <div
                        v-for="
                          book in getBooks(
                            level.levelId,
                            type.typeId
                          )
                        "
                        :key="
                          book.bookId
                        "
                        class="
                          book-group
                        "
                      >


                        <!-- BOOK -->

                        <div
                          class="
                            book-item
                          "
                        >

                          <i
                            class="
                              bi bi-book
                              me-2
                            "
                          ></i>

                          {{
                            book.bookName
                          }}

                        </div>


                        <!-- LESSON -->

                        <div
                          class="
                            lesson-list
                          "
                        >

                          <button
                            v-for="
                              lesson
                              in book.lessons
                            "
                            :key="
                              lesson.lessonId
                            "
                            class="
                              lesson-item
                            "
                          >

                            <i
                              class="
                                bi
                                bi-file-earmark-text
                                me-2
                              "
                            ></i>

                            {{
                              lesson.lessonName
                            }}

                          </button>

                        </div>

                      </div>


                      <!-- EMPTY -->

                      <div
                        v-if="
                          !isBooksLoading(
                            level.levelId,
                            type.typeId
                          ) &&
                          !getBooks(
                            level.levelId,
                            type.typeId
                          ).length
                        "
                        class="
                          empty-books
                        "
                      >

                        Không có sách

                      </div>

                    </div>

                  </Transition>

                </div>

              </div>

            </Transition>

          </div>

        </div>

      </div>

    </div>

  </div>

</template>


<style scoped>

/* =========================
   SIDEBAR
========================= */

.sidebar {

  position: fixed;

  top: 0;
  left: 0;

  width: 300px;

  height: 100vh;

  z-index: 1000;

  overflow-y: auto;

  background:
    linear-gradient(
      180deg,
      #0f172a,
      #1e293b
    );

  color: white;

  border-right:
    1px solid
    rgba(
      255,
      255,
      255,
      0.08
    );

}


/* =========================
   SCROLLBAR
========================= */

.sidebar::-webkit-scrollbar {

  width: 6px;

}


.sidebar::-webkit-scrollbar-thumb {

  background:
    rgba(
      255,
      255,
      255,
      0.15
    );

  border-radius: 20px;

}


/* =========================
   HEADER
========================= */

.sidebar-header {

  padding: 24px 20px;

  border-bottom:
    1px solid
    rgba(
      255,
      255,
      255,
      0.08
    );

}


.sidebar-title {

  margin: 0;

  font-size: 22px;

  font-weight: 700;

}


/* =========================
   MENU
========================= */

.sidebar-menu {

  padding: 16px;

}


/* =========================
   MENU ITEM
========================= */

.menu-item {

  width: 100%;

  border: none;

  background: transparent;

  color: #cbd5e1;

  padding: 12px 14px;

  border-radius: 12px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-bottom: 8px;

  transition: 0.2s ease;

  cursor: pointer;

  font-size: 15px;

  font-weight: 500;

}


.menu-item:hover {

  background:
    rgba(
      255,
      255,
      255,
      0.08
    );

  color: white;

}


.menu-item.active {

  background: #2563eb;

  color: white;

}


/* =========================
   MONITORING
========================= */

.monitoring-menu {

  margin-bottom: 8px;

}


/* =========================
   MONITORING SUB MENU
========================= */

.monitoring-submenu {

  margin-left: 14px;

  padding-left: 10px;

  border-left:
    1px solid
    rgba(
      255,
      255,
      255,
      0.12
    );

  margin-bottom: 10px;

}


.monitoring-item {

  width: 100%;

  border: none;

  background: transparent;

  color: #cbd5e1;

  padding: 10px 12px;

  border-radius: 9px;

  display: flex;

  align-items: center;

  text-align: left;

  margin-bottom: 4px;

  cursor: pointer;

  transition: 0.2s ease;

  font-size: 14px;

  font-weight: 500;

}


.monitoring-item:hover {

  background:
    rgba(
      255,
      255,
      255,
      0.08
    );

  color: white;

}


.monitoring-item.active {

  background:
    rgba(
      37,
      99,
      235,
      0.85
    );

  color: white;

}


/* =========================
   TREE
========================= */

.tree-wrapper {

  margin-top: 10px;

}


.tree-body {

  margin-top: 10px;

}


/* =========================
   LOADING
========================= */

.loading-box,
.loading-books {

  display: flex;

  align-items: center;

  gap: 10px;

  padding: 12px;

  color: #cbd5e1;

}


/* =========================
   LEVEL
========================= */

.level-group {

  margin-bottom: 16px;

}


.level-item {

  width: 100%;

  border: none;

  padding: 10px 14px;

  border-radius: 10px;

  background:
    rgba(
      59,
      130,
      246,
      0.15
    );

  color: #93c5fd;

  font-weight: 700;

  display: flex;

  align-items: center;

  justify-content: space-between;

  cursor: pointer;

  transition: 0.2s ease;

}


.level-item:hover {

  background:
    rgba(
      59,
      130,
      246,
      0.22
    );

}


.level-left {

  display: flex;

  align-items: center;

}


/* =========================
   TYPE
========================= */

.type-list {

  margin-top: 8px;

  padding-left: 14px;

}


.type-group {

  margin-bottom: 10px;

}


.type-item {

  width: 100%;

  border: none;

  padding: 10px 12px;

  border-radius: 8px;

  background:
    rgba(
      255,
      255,
      255,
      0.05
    );

  color: #facc15;

  font-weight: 600;

  display: flex;

  align-items: center;

  justify-content: space-between;

  cursor: pointer;

  transition: 0.2s ease;

}


.type-item:hover {

  background:
    rgba(
      255,
      255,
      255,
      0.08
    );

}


.type-left {

  display: flex;

  align-items: center;

}


/* =========================
   BOOK
========================= */

.book-list {

  margin-top: 6px;

  padding-left: 14px;

}


.book-group {

  margin-bottom: 8px;

}


.book-item {

  padding: 8px 12px;

  border-radius: 8px;

  background:
    rgba(
      255,
      255,
      255,
      0.04
    );

  color: #f8fafc;

  display: flex;

  align-items: center;

  font-size: 14px;

  font-weight: 500;

}


/* =========================
   LESSON
========================= */

.lesson-list {

  margin-top: 4px;

  padding-left: 14px;

  display: flex;

  flex-direction: column;

  gap: 4px;

}


.lesson-item {

  width: 100%;

  border: none;

  background: transparent;

  color: #cbd5e1;

  text-align: left;

  padding: 7px 10px;

  border-radius: 8px;

  cursor: pointer;

  transition: 0.2s ease;

  font-size: 13px;

}


.lesson-item:hover {

  background:
    rgba(
      255,
      255,
      255,
      0.08
    );

  color: white;

}


/* =========================
   EMPTY
========================= */

.empty-books {

  padding: 10px 12px;

  color: #94a3b8;

  font-size: 13px;

}


/* =========================
   ANIMATION
========================= */

.fade-enter-active,
.fade-leave-active {

  transition:
    all 0.2s ease;

}


.fade-enter-from,
.fade-leave-to {

  opacity: 0;

  transform:
    translateY(-4px);

}

</style>
