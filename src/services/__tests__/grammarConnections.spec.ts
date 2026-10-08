import { expect, it } from 'vitest'
import { grammarConnections } from '../grammarConnections'

it('shows the three verb groups for a stem compound without suggesting adjectives or nouns', () => {
  const examples = grammarConnections('Vます形（−ます） + 始める')
  expect(examples.map(item => item.transformed)).toEqual(['読み', '食べ', 'し'])
  expect(examples.every(item => item.category === 'Động từ')).toBe(true)
  expect(examples[0]!.combined).toBe('読み + 始める → 読み始める')
})
it('shows the specific negative and dictionary forms rather than treating every V as a stem', () => {
  expect(grammarConnections('Vる / Vない + ように言う').map(item => item.transformed)).toEqual(['読む', '読まない'])
})
it('uses the appropriate adjective and noun connectors in a plain-form pattern', () => {
  const examples = grammarConnections('Thể thông thường + はず; Aな + な／N + の + はず')
  expect(examples.map(item => item.transformed)).toEqual(['読む', '高い', '静かな', '学生の'])
})
it('illustrates the ku and ja transformations without inventing full sentences', () => {
  const examples = grammarConnections('Tính từ い bỏ い + く / tính từ な + じゃ / N + じゃ + なさそうだ')
  expect(examples.map(item => item.transformed)).toEqual(['高く', '静かじゃ', '学生じゃ'])
  expect(examples.every(item => !item.combined)).toBe(true)
})
it('handles nai stems and causative passive forms correctly', () => {
  expect(grammarConnections('Vない bỏ ない + ずに')[0]!.transformed).toBe('読ま')
  expect(grammarConnections('V thể bị sai khiến (使役受身)')[0]!.transformed).toBe('読まされる')
})
it('does not impose all word classes on a noun-only pattern or guess a conversational abbreviation', () => {
  expect(grammarConnections('N + にとって（は／も）').map(item => item.category)).toEqual(['Danh từ'])
  expect(grammarConnections('～ている → ～てる; ～ておく → ～とく')).toEqual([])
  expect(grammarConnections('')).toEqual([])
})

it('respects specified time nouns and causative te forms', () => {
  expect(grammarConnections('N chỉ thời gian + を通じて')[0]!.transformed).toBe('一年')
  expect(grammarConnections('V thể sai khiến + て + もらう')[0]!.transformed).toBe('読ませて')
  expect(grammarConnections('V thể bị động + て + しまう')[0]!.transformed).toBe('読まれて')
})

it('preserves the voiced ta-form when showing tari connections', () => {
  const examples = grammarConnections('Thể thông thường quá khứ bỏ た + たりして')
  expect(examples[0]!.combined).toBe('読んだ + りして → 読んだりして')
  expect(examples.map(item => item.transformed)).toEqual(['読んだ', '高かった', '静かだった', '学生だった'])
})
