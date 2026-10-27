import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VocabularyFlashcards from '../VocabularyFlashcardsView.vue'

const mocks = vi.hoisted(() => ({ get: vi.fn(), route: { params: { courseId: '42' } } }))
vi.mock('@/api/authApi', () => ({ gatewayUrl: { get: mocks.get } }))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route }))

const response = { data: { id: 'mimi', title: 'Mimi Kara N3', level: 'N3', totalCards: 3, cards: [
  { number: 1, unit: 1, word: '男性', reading: 'だんせい', meaning: 'đàn ông', sinoVietnamese: 'NAM TÍNH', exampleJapanese: 'その男性はとても親切です。', exampleVietnamese: 'Người đàn ông đó rất tử tế.' },
  { number: 2, unit: 1, word: '女性', reading: 'じょせい', meaning: 'phụ nữ', sinoVietnamese: 'NỮ TÍNH', exampleJapanese: '女性の参加者が増えました。', exampleVietnamese: 'Số người tham gia là nữ đã tăng.' },
  { number: 121, unit: 2, word: '渇く', reading: 'かわく', meaning: 'khát', sinoVietnamese: 'KHÁT', exampleJapanese: '運動の後で喉が渇いた。', exampleVietnamese: 'Sau khi vận động tôi thấy khát.' },
] } }
const open = () => mount(VocabularyFlashcards, { global: { stubs: { RouterLink: true } } })

beforeEach(() => mocks.get.mockReset())

it('loads the N3 deck and reveals the answer by flipping the card', async () => {
  mocks.get.mockResolvedValue(response)
  const wrapper = open(); await flushPromises()
  expect(mocks.get).toHaveBeenCalledWith('/api/nihongo-user/courses/42/vocabulary-deck')
  expect(wrapper.get('.card-front strong').text()).toBe('男性')
  await wrapper.get('.flip-card').trigger('click')
  expect(wrapper.get('.flip-card').classes()).toContain('flipped')
  expect(wrapper.get('.card-back').text()).toContain('だんせい')
  expect(wrapper.get('.card-back').text()).toContain('NAM TÍNH')
  expect(wrapper.get('.card-back').text()).toContain('đàn ông')
  expect(wrapper.get('.example-japanese').text()).toBe('その男性はとても親切です。')
  expect(wrapper.get('.example-vietnamese').text()).toBe('Người đàn ông đó rất tử tế.')
})

it('moves through cards and resets the answer side', async () => {
  mocks.get.mockResolvedValue(response)
  const wrapper = open(); await flushPromises()
  await wrapper.get('.flip-card').trigger('click')
  await wrapper.findAll('button').find(button => button.text().includes('Thẻ tiếp'))!.trigger('click')
  expect(wrapper.get('.card-front strong').text()).toBe('女性')
  expect(wrapper.get('.flip-card').classes()).not.toContain('flipped')
})

it('switches unit and starts at its first card', async () => {
  mocks.get.mockResolvedValue(response)
  const wrapper = open(); await flushPromises()
  await wrapper.get('select').setValue('2')
  expect(wrapper.get('.card-front strong').text()).toBe('渇く')
  expect(wrapper.text()).toContain('1 / 1')
})


it('shows Minna no Nihongo cards by lesson, with the word itself when it has no kanji', async () => {
  mocks.get.mockResolvedValue({ data: { id: 'minna', title: 'Minna no Nihongo II', level: 'N4', totalCards: 2, cards: [
    { number: 1, unit: 26, word: '運動会', reading: 'うんどうかい', meaning: 'hội thao', sinoVietnamese: 'VẬN ĐỘNG HỘI', exampleJapanese: '', exampleVietnamese: '' },
    { number: 2, unit: 26, word: 'ごみ', reading: '', meaning: 'rác', sinoVietnamese: '', exampleJapanese: '', exampleVietnamese: '' },
  ] } })
  const wrapper = open(); await flushPromises()
  expect(wrapper.text()).toContain('Khóa học N4 · Từ vựng')
  expect(wrapper.get('select').text()).toBe('Bài 26')
  expect(wrapper.get('.card-number').text()).toBe('1 · Bài 26')
  expect(wrapper.find('.example-block').exists()).toBe(false)
  await wrapper.findAll('button').find(button => button.text().includes('Thẻ tiếp'))!.trigger('click')
  expect(wrapper.get('.answer-reading').text()).toBe('ごみ')
})
