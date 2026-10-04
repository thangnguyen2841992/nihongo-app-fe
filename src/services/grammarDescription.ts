/** Render the small set of formatting tags used by imported grammar notes, without active content. */
export function grammarDescriptionHtml(description: string | null | undefined): string {
  const value = description ?? ''
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (!/<(?:p|br|h4|ul|ol|li|strong|b|em|i|ruby|rt|rp)(?:\s|\/?>)/i.test(value)) return escape(value)
  const document = new DOMParser().parseFromString(value, 'text/html')
  const allowed = new Set(['P', 'BR', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'RUBY', 'RT', 'RP'])
  const blocked = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'LINK', 'META'])
  function render(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return escape(node.textContent ?? '')
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const element = node as Element
    const tagName = element.tagName.toUpperCase()
    if (blocked.has(tagName)) return ''
    const content = Array.from(node.childNodes).map(render).join('')
    if (!allowed.has(tagName)) return content
    const tag = element.tagName.toLowerCase()
    return tag === 'br' ? '<br>' : `<${tag}>${content}</${tag}>`
  }
  return Array.from(document.body.childNodes).map(render).join('')
}
