import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import SidebarMyCourses from '../SidebarMyCourses.vue'
import { getMyCourses, type MyCourse } from '@/api/study'
import { saveLearningPosition } from '@/api/learningPosition'

const state = {
  isAuthenticated: ref(true),
  userEmail: ref('first@example.test'),
  userRole: ref('USER'),
}
vi.mock('@/services/authState', () => ({ useAuthState: () => state }))
vi.mock('@/api/study', () => ({ getMyCourses: vi.fn() }))
vi.mock('@/api/learningPosition', () => ({ saveLearningPosition: vi.fn() }))
const date = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString()
const course = (id: number, input: Partial<MyCourse> = {}): MyCourse => ({
  courseId: id,
  courseName: `Course ${id}`,
  packageName: 'VIP',
  progress: 25,
  startedAt: date(-10),
  lastBookId: null,
  lastLessonId: null,
  lastStudiedAt: date(-1),
  enrolledAt: date(-20),
  expiredAt: date(10),
  ...input,
})
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.resetAllMocks()
  state.isAuthenticated.value = true
  state.userEmail.value = 'first@example.test'
  state.userRole.value = 'USER'
  vi.mocked(getMyCourses).mockResolvedValue([])
  vi.mocked(saveLearningPosition).mockResolvedValue(undefined)
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})
async function open() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/course/:courseId/books', name: 'CourseBooks', component: { template: '<div />' } },
      { path: '/course/:courseId/vocabulary-flashcards', name: 'course-vocabulary-flashcards', component: { template: '<div />' } },
      { path: '/course/:courseId/conversation-listening', name: 'course-conversation-listening', component: { template: '<div />' } },
      {
        path: '/course/book/:bookId',
        name: 'CourseBookDetail',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push('/')
  await router.isReady()
  wrapper = mount(SidebarMyCourses, { global: { plugins: [router] } })
  await flushPromises()
  return router
}
it('shows active memberships in recent order and hides expired or invalid dates', async () => {
  vi.mocked(getMyCourses).mockResolvedValue([
    course(1, { lastStudiedAt: date(-5) }),
    course(2),
    course(3, { expiredAt: date(-1) }),
    course(4, { expiredAt: 'bad-date' }),
  ])
  await open()
  expect(wrapper!.findAll('.quick-course strong').map((link) => link.text())).toEqual([
    'Course 2',
    'Course 1',
  ])
  expect(wrapper!.text()).toContain('25% · Học tiếp')
})
it('resumes the saved book and lesson and marks the current course', async () => {
  vi.mocked(getMyCourses).mockResolvedValue([course(1, { lastBookId: 12, lastLessonId: 24 })])
  const router = await open()
  await wrapper!.get('a').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.fullPath).toBe('/course/book/12?courseId=1&lessonId=24')
  expect(wrapper!.get('a').attributes('aria-current')).toBe('page')
  expect(saveLearningPosition).not.toHaveBeenCalled()
  expect(wrapper!.emitted('navigate')).toHaveLength(1)
})
it('starts an unstarted course once and opens its book list', async () => {
  vi.mocked(getMyCourses).mockResolvedValue([course(2, { startedAt: null, lastStudiedAt: null })])
  const router = await open()
  await wrapper!.get('a').trigger('click')
  await flushPromises()
  expect(saveLearningPosition).toHaveBeenCalledWith(2)
  expect(router.currentRoute.value.fullPath).toBe('/course/2/books')
})
it('keeps navigation in place when starting fails', async () => {
  vi.mocked(getMyCourses).mockResolvedValue([course(2, { startedAt: null })])
  vi.mocked(saveLearningPosition).mockRejectedValue(new Error('offline'))
  const router = await open()
  await wrapper!.get('a').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/')
  expect(wrapper!.get('[role="alert"]').text()).toContain('Chưa mở được')
  expect(wrapper!.emitted('navigate')).toBeUndefined()
})
it('retries a list failure and refreshes after a purchase without refetching on every focus', async () => {
  vi.mocked(getMyCourses).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
  await open()
  await wrapper!.get('button').trigger('click')
  await flushPromises()
  expect(wrapper!.text()).toContain('Chưa có khóa học còn hạn')
  window.dispatchEvent(new Event('focus'))
  await flushPromises()
  expect(getMyCourses).toHaveBeenCalledTimes(2)
  vi.mocked(getMyCourses).mockResolvedValueOnce([course(3)])
  window.dispatchEvent(new Event('wallet:changed'))
  await flushPromises()
  expect(wrapper!.text()).toContain('Course 3')
})
it('clears old account data, aborts its request and ignores a late response', async () => {
  let finish!: (rows: MyCourse[]) => void
  vi.mocked(getMyCourses)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    .mockResolvedValueOnce([course(2)])
  await open()
  const signal = vi.mocked(getMyCourses).mock.calls[0]![0]!
  state.userEmail.value = 'second@example.test'
  await flushPromises()
  expect(signal.aborted).toBe(true)
  finish([course(1)])
  await flushPromises()
  expect(wrapper!.text()).toContain('Course 2')
  expect(wrapper!.text()).not.toContain('Course 1')
  const lastSignal = vi.mocked(getMyCourses).mock.calls[1]![0]!
  wrapper!.unmount()
  wrapper = undefined
  expect(lastSignal.aborted).toBe(true)
})
it('does not navigate an old account after its start request finishes', async () => {
  let finish!: () => void
  vi.mocked(getMyCourses).mockResolvedValue([course(2, { startedAt: null })])
  vi.mocked(saveLearningPosition).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const router = await open()
  await wrapper!.get('a').trigger('click')
  state.userEmail.value = 'second@example.test'
  await flushPromises()
  finish()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/')
  expect(wrapper!.emitted('navigate')).toBeUndefined()
})

it('keeps the last selection when an earlier course starts slowly', async () => {
  let finish!: () => void
  vi.mocked(getMyCourses).mockResolvedValue([course(4, { startedAt: null }), course(3)])
  vi.mocked(saveLearningPosition).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const router = await open()
  await wrapper!.findAll('a')[0]!.trigger('click')
  await wrapper!.findAll('a')[1]!.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/course/3/books')
  finish()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/course/3/books')
  expect(wrapper!.emitted('navigate')).toHaveLength(1)
})

it('uses the final click during pending navigation even when returning to the current course', async () => {
  vi.mocked(getMyCourses).mockResolvedValue([course(3), course(4), course(5)])
  const router = await open()
  await router.push('/course/3/books')
  const links = wrapper!.findAll('a')
  for (const index of [1, 2, 0]) (links[index]!.element as HTMLAnchorElement).click()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/course/3/books')
  expect(wrapper!.get('[aria-current="page"]').text()).toContain('Course 3')
  expect(wrapper!.emitted('navigate')).toHaveLength(1)
})

it('deduplicates starting the same course while letting the latest selection finish', async () => {
  let finish!: () => void
  vi.mocked(getMyCourses).mockResolvedValue([course(3, { startedAt: null }), course(4)])
  vi.mocked(saveLearningPosition).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const router = await open()
  const links = wrapper!.findAll('a')
  await links[0]!.trigger('click')
  await links[1]!.trigger('click')
  await links[0]!.trigger('click')
  expect(saveLearningPosition).toHaveBeenCalledTimes(1)
  finish()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/course/3/books')
  expect(wrapper!.findAll('[aria-busy="true"]')).toHaveLength(0)
})

it('shows the three N3 sections and switches from a saved book to flashcards, conversation and books', async () => {
  vi.mocked(getMyCourses).mockResolvedValue([
    course(42, { courseName: 'Tiếng Nhật N3', lastBookId: 12, lastLessonId: 24 }),
    course(4, { courseName: 'Tiếng Nhật N4' }),
    course(30, { courseName: 'N30' }),
    course(43, { courseName: 'N3 hết hạn', expiredAt: date(-1) }),
  ])
  const router = await open()
  expect(wrapper!.findAll('.course-sections')).toHaveLength(1)
  expect(wrapper!.findAll('.course-section').map(link => link.text())).toEqual([
    'Giáo trình sách', 'Flashcard từ vựng', 'Hội thoại',
  ])
  await router.push('/course/book/12?courseId=42&lessonId=24')
  expect(wrapper!.get('[aria-current="page"]').text()).toBe('Giáo trình sách')
  const links = wrapper!.findAll('.course-section')
  for (const [index, path] of [[1, 'vocabulary-flashcards'], [2, 'conversation-listening'], [0, 'books']] as const) {
    await links[index]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/course/42/${path}`)
    expect(wrapper!.get('[aria-current="page"]').text()).toBe(links[index]!.text())
  }
  expect(saveLearningPosition).not.toHaveBeenCalled()
})

it('keeps the N3 section selected when another course finishes starting later', async () => {
  let finish!: () => void
  vi.mocked(getMyCourses).mockResolvedValue([
    course(4, { startedAt: null }), course(42, { courseName: 'N3' }),
  ])
  vi.mocked(saveLearningPosition).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const router = await open()
  await wrapper!.get('.quick-course').trigger('click')
  await wrapper!.findAll('.course-section')[1]!.trigger('click')
  await flushPromises()
  finish()
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/course/42/vocabulary-flashcards')
})
