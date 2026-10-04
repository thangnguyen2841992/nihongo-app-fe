import { expect, it } from 'vitest'
import { grammarDescriptionHtml } from '../grammarDescription'

it('preserves grammar paragraphs and Plus notes', () => {
  expect(grammarDescriptionHtml('<p>V + 始める</p><h4>Plus</h4><ul><li>終わる</li></ul>'))
    .toBe('<p>V + 始める</p><h4>Plus</h4><ul><li>終わる</li></ul>')
})
it('strips active content and attributes from stored descriptions', () => {
  expect(grammarDescriptionHtml('<p onclick="alert(1)">日本語<img src="x" onerror="alert(1)"></p><script>alert(1)</script><svg onload="alert(1)">bad</svg><a href="javascript:alert(1)">link</a>'))
    .toBe('<p>日本語</p>link')
})
it('keeps ordinary text and handles absent descriptions', () => {
  expect(grammarDescriptionHtml('Giải thích & ví dụ\n日本語')).toBe('Giải thích &amp; ví dụ\n日本語')
  expect(grammarDescriptionHtml(null)).toBe('')
  expect(grammarDescriptionHtml('<N> + なら')).toBe('&lt;N&gt; + なら')
})
