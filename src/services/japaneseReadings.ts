import { reactive, watch, type Directive } from 'vue'
import { gatewayUrl } from '@/api/authApi'

/**
 * Hiragana and Hán Việt of kanji words in Japanese text that pages render with v-html, shown on hover / tap.
 * Use `v-japanese-readings` on the element holding the HTML; the learner turns each layer on or off with
 * <JapaneseReadingToggle>. Readings come from nihongo-user (kuromoji + Hán Việt dictionary) and are cached here.
 * Text the author already wrapped in <ruby> keeps the author's furigana.
 */
export interface ReadingSegment {
  text: string
  reading: string | null
  hanViet: string | null
}

const PREFS_KEY = 'japanese-readings'
function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') as { furigana?: unknown; hanViet?: unknown; meaningShown?: unknown }
    // meaningShown: Vietnamese translations of examples are hidden by default (the learner translates first, then
    // reveals one example, or all of them with the "Nghĩa" button).
    return { furigana: saved.furigana !== false, hanViet: saved.hanViet !== false, meaning: saved.meaningShown === true }
  } catch {
    return { furigana: true, hanViet: true, meaning: false }
  }
}
export const japaneseReadingPrefs = reactive(loadPrefs())
watch(japaneseReadingPrefs, (value) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ furigana: value.furigana, hanViet: value.hanViet, meaningShown: value.meaning }))
  } catch {
    /* Applies for this visit only. */
  }
  for (const element of [...tracked]) void apply(element)
})

const KANJI = /[㐀-鿿豈-﫿々]/
const SKIP = 'ruby, rt, rp, script, style, code, textarea, .jr-word, .jr-ja'
const CACHE_LIMIT = 3000
const cache = new Map<string, ReadingSegment[]>()
let queue: { text: string; resolve: (value: ReadingSegment[] | null) => void }[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let unavailableUntil = 0

function remember(text: string, segments: ReadingSegment[]) {
  cache.set(text, segments)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
}

async function flush() {
  flushTimer = null
  const batch = queue
  queue = []
  const texts = [...new Set(batch.map((item) => item.text))]
  const found = new Map<string, ReadingSegment[]>()
  // Requests stay small: at most 100 texts and 30 000 characters each.
  for (let start = 0; start < texts.length; ) {
    const chunk: string[] = []
    let size = 0
    while (start < texts.length && chunk.length < 100 && size + texts[start]!.length <= 30_000) {
      size += texts[start]!.length
      chunk.push(texts[start++]!)
    }
    if (!chunk.length) {
      start++
      continue
    }
    try {
      const { data } = await gatewayUrl.post<{ results: ReadingSegment[][] }>('/api/nihongo-user/japanese/readings', {
        texts: chunk,
      })
      chunk.forEach((text, index) => {
        const segments = data.results?.[index]
        if (segments) {
          remember(text, segments)
          found.set(text, segments)
        }
      })
    } catch {
      unavailableUntil = Date.now() + 30_000
      break
    }
  }
  for (const item of batch) item.resolve(found.get(item.text) ?? null)
}

function readings(text: string): Promise<ReadingSegment[] | null> {
  const cached = cache.get(text)
  if (cached) return Promise.resolve(cached)
  if (Date.now() < unavailableUntil) return Promise.resolve(null)
  return new Promise((resolve) => {
    queue.push({ text, resolve })
    flushTimer ??= setTimeout(() => void flush(), 30)
  })
}

// Nothing is added to the text itself: words with kanji are only marked (faint dotted underline) and their hiragana /
// Hán Việt appear in a card when the learner points at, focuses or taps the word. The two toggles choose what the
// card shows.
function render(segments: ReadingSegment[]): DocumentFragment {
  const fragment = document.createDocumentFragment()
  for (const segment of segments) {
    const reading = japaneseReadingPrefs.furigana ? segment.reading : null
    const hanViet = japaneseReadingPrefs.hanViet ? segment.hanViet : null
    if (!reading && !hanViet) {
      fragment.append(segment.text)
      continue
    }
    const word = document.createElement('span')
    word.className = 'jr-word has-hv'
    word.dataset.word = segment.text
    if (reading) word.dataset.reading = reading
    if (hanViet) word.dataset.hanViet = hanViet
    word.dataset.hv = [reading, hanViet].filter(Boolean).join(' · ')
    word.tabIndex = 0
    word.append(segment.text)
    fragment.append(word)
  }
  return fragment
}

// Reading card shown when the learner points at, focuses or taps an annotated word. It lives on <body> with fixed
// positioning so no card, scroll box or neighbouring line can clip or cover it.
let popover: HTMLElement | null = null
let popoverFor: HTMLElement | null = null
function hidePopover() {
  popoverFor = null
  if (popover) popover.hidden = true
}
function showPopover(word: HTMLElement) {
  if (popoverFor === word && popover && !popover.hidden) return
  if (!popover) {
    popover = document.createElement('div')
    popover.className = 'jr-popover'
    popover.setAttribute('role', 'tooltip')
    document.body.append(popover)
  }
  popoverFor = word
  popover.replaceChildren()
  const kanji = document.createElement('span')
  kanji.className = 'jr-popover-word'
  kanji.lang = 'ja'
  kanji.textContent = word.dataset.word ?? ''
  popover.append(kanji)
  if (word.dataset.reading) {
    const reading = document.createElement('span')
    reading.className = 'jr-popover-reading'
    reading.lang = 'ja'
    reading.textContent = word.dataset.reading
    popover.append(reading)
  }
  if (word.dataset.hanViet) {
    const sino = document.createElement('span')
    sino.className = 'jr-popover-hv'
    sino.textContent = word.dataset.hanViet
    popover.append(sino)
  }
  popover.hidden = false
  const box = word.getBoundingClientRect()
  const card = popover.getBoundingClientRect()
  const gap = 8
  let top = box.top - card.height - gap
  if (top < 8) top = box.bottom + gap
  const left = Math.min(Math.max(8, box.left + box.width / 2 - card.width / 2), window.innerWidth - card.width - 8)
  popover.style.top = `${Math.round(top)}px`
  popover.style.left = `${Math.round(left)}px`
}
const annotatedWord = (target: EventTarget | null) =>
  target instanceof Element ? (target.closest('.jr-word.has-hv') as HTMLElement | null) : null
if (typeof document !== 'undefined') {
  document.addEventListener('mouseover', (event) => {
    const word = annotatedWord(event.target)
    if (word) showPopover(word)
    else if (popoverFor && !(event.target instanceof Element && event.target.closest('.jr-popover'))) hidePopover()
  })
  document.addEventListener('focusin', (event) => {
    const word = annotatedWord(event.target)
    if (word) showPopover(word)
  })
  document.addEventListener('focusout', (event) => { if (annotatedWord(event.target) === popoverFor) hidePopover() })
  document.addEventListener('click', (event) => {
    const word = annotatedWord(event.target)
    if (word) showPopover(word)
    else hidePopover()
  })
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hidePopover() })
  window.addEventListener('scroll', hidePopover, true)
  window.addEventListener('resize', hidePopover)
}

// Elements using the directive, their original HTML and the HTML we produced (to tell our DOM from a new v-html).
// Mixed elements (`v-japanese-readings="'mixed'"`, e.g. Vietnamese notes with Japanese examples) also get every
// Japanese run wrapped in <span class="jr-ja" lang="ja"> so it uses the Japanese font and weight.
const tracked = new Set<HTMLElement>()
const mixed = new WeakSet<HTMLElement>()
const original = new WeakMap<HTMLElement, string>()
const produced = new WeakMap<HTMLElement, string>()
const runs = new WeakMap<HTMLElement, number>()
const appliedWith = new WeakMap<HTMLElement, string>()
const prefsKey = () => `${japaneseReadingPrefs.furigana}|${japaneseReadingPrefs.hanViet}`
const JAPANESE = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\u3005]/

async function apply(element: HTMLElement) {
  const run = (runs.get(element) ?? 0) + 1
  runs.set(element, run)
  // A new v-html value replaced our annotated DOM: that is the new original.
  if (produced.get(element) !== element.innerHTML) {
    original.set(element, element.innerHTML)
    produced.delete(element)
  }
  // Re-render of the page without new content: our annotations are still current.
  if (produced.has(element) && appliedWith.get(element) === prefsKey()) return
  const source = original.get(element) ?? element.innerHTML
  const annotate = japaneseReadingPrefs.furigana || japaneseReadingPrefs.hanViet
  const wrap = mixed.has(element)
  if (!annotate && !wrap) {
    if (produced.has(element)) {
      element.innerHTML = source
      produced.delete(element)
    }
    return
  }
  const template = document.createElement('template')
  template.innerHTML = source
  const nodes: Text[] = []
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text
    if (text.parentElement?.closest(SKIP)) continue
    if (annotate ? KANJI.test(text.data) || (wrap && JAPANESE.test(text.data)) : wrap && JAPANESE.test(text.data))
      nodes.push(text)
  }
  if (!nodes.length) {
    produced.set(element, element.innerHTML)
    appliedWith.set(element, prefsKey())
    return
  }
  const results = await Promise.all(
    nodes.map((node) => (annotate && KANJI.test(node.data) ? readings(node.data) : Promise.resolve(null))),
  )
  if (runs.get(element) !== run || !element.isConnected) return
  if (produced.has(element) ? produced.get(element) !== element.innerHTML : original.get(element) !== element.innerHTML) return
  let changed = false
  nodes.forEach((node, index) => {
    const segments = results[index]
    let replacement: Node | null = segments ? render(segments) : null
    if (wrap) {
      const span = document.createElement('span')
      span.className = 'jr-ja'
      span.lang = 'ja'
      span.append(replacement ?? node.data)
      replacement = span
    }
    if (!replacement) return
    node.replaceWith(replacement)
    changed = true
  })
  if (!changed) return
  element.innerHTML = template.innerHTML
  produced.set(element, element.innerHTML)
  appliedWith.set(element, prefsKey())
}

export const vJapaneseReadings: Directive<HTMLElement, 'mixed' | undefined> = {
  mounted(element, binding) {
    tracked.add(element)
    if (binding.value === 'mixed') {
      mixed.add(element)
      element.classList.add('jr-mixed')
    } else element.lang ||= 'ja'
    void apply(element)
  },
  updated(element) {
    void apply(element)
  },
  unmounted(element) {
    tracked.delete(element)
  },
}
