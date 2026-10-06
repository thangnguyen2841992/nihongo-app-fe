import tryN4Order from '@/data/try-n4-lesson-order.json'
const sourceOrder = new Map(tryN4Order.map((name, index) => [name, index]))
const lessonNameCollator = new Intl.Collator('vi', { numeric: true })
export function bookLessonOrder<T extends { name: string }>(lessons: T[]): T[] {
  if (lessons.length && lessons.every(lesson => sourceOrder.has(lesson.name))) {
    return [...lessons].sort((left, right) => sourceOrder.get(left.name)! - sourceOrder.get(right.name)!)
  }
  if (!lessons.length || !lessons.every(lesson => /^\d{2}\. /.test(lesson.name))) return lessons
  return [...lessons].sort((left, right) => lessonNameCollator.compare(left.name, right.name))
}
