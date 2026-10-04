import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined, viewport: { width: 1440, height: 1000 } })
const book = JSON.parse(readFileSync(new URL('../../imports/try-n4/normalized-book.json', import.meta.url), 'utf8'))
const lesson = book.lessons.find((part: any) => part.sourceName === '2 おかし作り (2)')
const groups = [...new Set<string>(lesson.exercises.map((q: any) => q.groupName))]
const before = JSON.parse(readFileSync(new URL('../../imports/try-n4/answers-before.json', import.meta.url), 'utf8'))
const questionIds = before.filter((row: any) => row.key.startsWith('2:')).map((row: any) => row.exerciseId)
const aiSolutions = JSON.parse(readFileSync(new URL('../../nihongo-staff/src/main/resources/imports/book-import/try-n4-ai-answers.json', import.meta.url), 'utf8'))
for (const role of ['STAFF', 'USER']) {
  test(`${role}: N4 keeps source layout, its own audio and AI solution provenance`, async ({ page }) => {
    let submissions = 0
    await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const path = new URL(route.request().url()).pathname
      const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
      if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
      let json: any = []
      if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Kiểm thử', email: 'test@example.com', role, sessionId: 'n4-test' }
      else if (path === '/api/staff/lessons/11') json = { ...lesson, lessonId: 11, bookId: 7 }
      else if (path === '/api/staff/exerciseTypes') json = groups.map((name, index) => ({ exerciseTypeId: 20 + index, name }))
      else if (path === '/api/staff/getAllExcercisesKeywordOfLesson/11') json = lesson.exercises.map((q: any, index: number) => ({ ...q, exerciseTypeName: q.groupName, exerciseTypeId: 20 + groups.indexOf(q.groupName), exerciseKeywordId: questionIds[index], correctAnswer: role === 'STAFF' ? q.correctAnswer : null, aiSolution: role === 'STAFF' ? aiSolutions[questionIds[index]] : null, audioUrl: q.audioId ? `/api/staff/imported-audio/exercises/${questionIds[index]}` : null }))
      else if (path.startsWith('/api/staff/imported-audio/exercises/')) {
        const question = lesson.exercises[questionIds.indexOf(Number(path.split('/').at(-1)))]
        const asset = book.audio.find((item: any) => item.id === question.audioId)
        await route.fulfill({ headers, contentType: 'audio/mpeg', body: readFileSync(new URL(`../../.local/book-imports/9302eb8d-2a9e-4e6e-8129-3a412baf7acf/audio/${asset.id}.${asset.extension}`, import.meta.url)) }); return
      } else if (path === '/api/nihongo-user/userExerciseAttempt') {
        submissions++
        json = { totalQuestion: 11, correctCount: 0, wrongCount: 11, correctAnswers: Object.fromEntries(lesson.exercises.map((q: any, i: number) => [questionIds[i], q.correctAnswer])), aiSolutions }
      }
      await route.fulfill({ headers, json })
    })
    await page.goto(role === 'STAFF' ? '/staff/lesson/11/exercises' : '/course/lesson/11/exercises')
    await expect(page.locator('.exercise-card')).toHaveCount(11)
    await expect(page.locator('.book-exercise-heading h3')).toHaveText(['〈文の組み立て〉', '〈文章の文法〉', '〈聴解〉'])
    await expect(page.locator('.shared-reading')).toHaveCount(1)
    await expect(page.locator('audio')).toHaveCount(3)
    for (const player of await page.locator('audio').all()) await expect(player).toHaveAttribute('src', /\/api\/staff\/imported-audio\/exercises\//)
    await page.locator('.source-pages summary').first().click()
    const image = page.locator('.source-pages img').first()
    await image.scrollIntoViewIfNeeded()
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(1000)
    const player = page.locator('audio').first()
    await player.evaluate((el: HTMLAudioElement) => el.play())
    await expect.poll(() => player.evaluate((el: HTMLAudioElement) => el.duration)).toBeGreaterThan(5)
    await player.evaluate((el: HTMLAudioElement) => el.pause())
    if (role === 'USER') {
      await expect(page.locator('.ai-solution')).toHaveCount(0)
      await expect(page.locator('.start-btn')).toBeEnabled()
      await expect(page.locator('.submit-btn')).toBeDisabled()
      await page.locator('.start-btn').click()
      await page.locator('.answer-item').first().click()
      await expect(page.locator('.answer-item').first()).toHaveClass(/selected/)
      await page.locator('.submit-btn').click()
      await expect(page.locator('.ai-solution')).toHaveCount(11)
      expect(submissions).toBe(1)
      await page.getByRole('button', { name: 'Đóng', exact: true }).click()
    }
    await expect(page.locator('.ai-answers').first()).toContainText('do AI tự giải')
    await page.locator('.ai-solution summary').first().click()
    await expect(page.locator('.ai-solution').first()).toContainText('Đáp án AI: C (3)')
    await page.locator('.source-pages summary').first().click()
    await page.locator('.book-review-title').scrollIntoViewIfNeeded()
    await expect(page.locator('.exercise-card').first()).toContainText('____ ____ ★ ____')
    await expect(page.locator('.exercise-card').first()).toContainText('おくれた')
    await expect(page.locator('.exercise-card').first()).not.toContainText('4-1-3-2')
    await page.screenshot({ path: `../imports/try-n4/${role.toLowerCase()}-review-preview.png` })
  })
}
