import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import {
  checkLocalPdf,
  createLocalAudio,
  emptyEnglishStudy,
  loadEnglishStudy,
  saveEnglishStudy,
} from '../englishSelfStudy'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

it('keeps notes and progress separate for different signed-in identities', () => {
  const first = emptyEnglishStudy()
  first['essential-grammar'] = {
    page: 19,
    currentUnit: 'Unit 4',
    completedUnits: 3,
    totalUnits: 20,
    notes: 'My private notes',
  }
  saveEnglishStudy(' First@Example.Test ', first)
  expect(loadEnglishStudy('first@example.test')['essential-grammar']).toEqual(
    first['essential-grammar'],
  )
  expect(loadEnglishStudy('second@example.test')['essential-grammar'].notes).toBe('')
  expect(() => saveEnglishStudy('', first)).toThrow('đăng nhập')
})

it('rejects invalid progress without overwriting previously saved notes', () => {
  const state = emptyEnglishStudy()
  state['tree-or-three'].notes = 'Keep this'
  saveEnglishStudy('u@example.test', state)
  state['tree-or-three'].totalUnits = 10
  state['tree-or-three'].completedUnits = 11
  expect(() => saveEnglishStudy('u@example.test', state)).toThrow('lớn hơn')
  expect(loadEnglishStudy('u@example.test')['tree-or-three'].notes).toBe('Keep this')
  state['tree-or-three'].completedUnits = 1
  state['tree-or-three'].page = Number.NaN
  expect(() => saveEnglishStudy('u@example.test', state)).toThrow('Trang đọc')
})

it('reports corrupt storage and leaves the original value available for recovery', () => {
  localStorage.setItem('english-self-study:v1:u%40example.test', '{broken')
  expect(() => loadEnglishStudy('u@example.test')).toThrow('chưa bị ghi đè')
  expect(localStorage.getItem('english-self-study:v1:u%40example.test')).toBe('{broken')
})

it('sanitizes unsupported stored fields and bounds progress from old data', () => {
  localStorage.setItem(
    'english-self-study:v1:u%40example.test',
    JSON.stringify({
      'essential-grammar': {
        page: -4,
        completedUnits: 100,
        totalUnits: 10,
        notes: '<script>text</script>',
        currentUnit: false,
        pdfUrl: 'https://untrusted.test',
      },
    }),
  )
  expect(loadEnglishStudy('u@example.test')['essential-grammar']).toEqual({
    page: 1,
    completedUnits: 10,
    totalUnits: 10,
    notes: '<script>text</script>',
    currentUnit: '',
  })
})

it('propagates storage failures instead of claiming that data was saved', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError')
  })
  expect(() => saveEnglishStudy('u@example.test', emptyEnglishStudy())).toThrow('Full')
})

it('checks the PDF signature instead of trusting the filename', async () => {
  await expect(
    checkLocalPdf(new File(['%PDF-1.7\n'], 'book.pdf', { type: 'application/pdf' })),
  ).resolves.toBeUndefined()
  await expect(
    checkLocalPdf(new File(['<html>not a book</html>'], 'fake.pdf', { type: 'application/pdf' })),
  ).rejects.toThrow('không phải PDF')
})

it('sorts local tracks in natural order and rejects non-audio before allocating URLs', () => {
  const create = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:track')
  expect(
    createLocalAudio([new File([''], 'Track 10.mp3'), new File([''], 'Track 2.mp3')]).map(
      (track) => track.name,
    ),
  ).toEqual(['Track 2.mp3', 'Track 10.mp3'])
  create.mockClear()
  expect(() =>
    createLocalAudio([
      new File([''], 'Track 1.mp3'),
      new File([''], 'bad.html', { type: 'text/html' }),
    ]),
  ).toThrow('file audio')
  expect(create).not.toHaveBeenCalled()
})

it('releases partially allocated URLs if opening a playlist fails', () => {
  vi.spyOn(URL, 'createObjectURL')
    .mockReturnValueOnce('blob:partial')
    .mockImplementationOnce(() => {
      throw new Error('Failed')
    })
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  expect(() => createLocalAudio([new File([''], '1.mp3'), new File([''], '2.mp3')])).toThrow(
    'Failed',
  )
  expect(revoke).toHaveBeenCalledWith('blob:partial')
})
