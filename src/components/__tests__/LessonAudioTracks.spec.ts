import { expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
vi.mock('@/services/endpoints', () => ({ gatewayBaseUrl: 'http://localhost:8082' }))
import LessonAudioTracks from '../LessonAudioTracks.vue'

const tracks = [
  { id: 1, label: 'ことば · Từ vựng', url: '/api/staff/imported-audio/lesson-tracks/1' },
  { id: 2, label: '文型 · Mẫu câu', url: '/api/staff/imported-audio/lesson-tracks/2' },
  { id: 3, label: '練習 A1 · Luyện tập A1', url: '/api/staff/imported-audio/lesson-tracks/3' },
  { id: 4, label: '練習 A2 · Luyện tập A2', url: '/api/staff/imported-audio/lesson-tracks/4' },
  { id: 5, label: '練習 B1 · Luyện tập B1', url: '/api/staff/imported-audio/lesson-tracks/5' },
]

it('groups the tracks by part and plays one at a time', async () => {
  const wrapper = mount(LessonAudioTracks, { props: { tracks } })
  expect(wrapper.findAll('.track-group').map((group) => group.get('.group-name [lang="ja"]').text()))
    .toEqual(['ことば', '文型', '練習 A', '練習 B'])
  expect(wrapper.findAll('audio')).toHaveLength(1)
  expect(wrapper.get('audio').attributes('src')).toBe('http://localhost:8082/api/staff/imported-audio/lesson-tracks/1')
  const practice = wrapper.findAll('.track-buttons button').find((button) => button.text() === 'A2')!
  await practice.trigger('click')
  expect(practice.attributes('aria-pressed')).toBe('true')
  expect(wrapper.get('audio').attributes('src')).toBe('http://localhost:8082/api/staff/imported-audio/lesson-tracks/4')
})

it('shows the conversation and both listening exercises of the textbook CD', () => {
  const wrapper = mount(LessonAudioTracks, { props: { tracks: [
    { id: 6, label: '会話 · Hội thoại', url: '/api/staff/imported-audio/lesson-tracks/6' },
    { id: 7, label: '問題 1 · Bài tập nghe 1', url: '/api/staff/imported-audio/lesson-tracks/7' },
    { id: 8, label: '問題 2 · Bài tập nghe 2', url: '/api/staff/imported-audio/lesson-tracks/8' },
  ] } })
  expect(wrapper.findAll('.track-group').map((group) => group.get('.group-name').text()))
    .toEqual(['会話Hội thoại', '問題Bài tập nghe'])
  expect(wrapper.findAll('.track-group')[1]!.findAll('button').map((button) => button.text())).toEqual(['1', '2'])
})
