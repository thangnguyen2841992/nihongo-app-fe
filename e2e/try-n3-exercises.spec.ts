import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined, viewport: { width: 1440, height: 1000 } })
const chapter = JSON.parse(readFileSync(new URL('../../imports/try-n3/chapter-1.json', import.meta.url), 'utf8'))
const layout = JSON.parse(readFileSync(new URL('../../imports/try-n3/review-layout.json', import.meta.url), 'utf8'))
const questions = chapter.lessons[1].exercises

for (const role of ['STAFF', 'USER']) {
  test(`${role}: keeps original sections and numeric choices without empty unrelated groups`, async ({ page }) => {
    let submittedAnswers: Record<string, string> | undefined
    const types = [{ exerciseTypeId: 1, name: 'Unrelated exercise category' }, ...layout.sections.map((s: any, i: number) => ({ exerciseTypeId: i + 20, name: s.typeName }))]
    const rows = questions.map((q: any, i: number) => ({ ...q, exerciseKeywordId: 101 + i, lessonId: 9,
      exerciseTypeId: 20 + layout.sections.findIndex((s: any) => s.typeName === q.exerciseTypeName), correctAnswer: role === 'STAFF' ? q.correctAnswer : undefined }))
    const correctAnswers = Object.fromEntries(questions.map((q: any, i: number) => [101 + i, q.correctAnswer]))
    await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const path = new URL(route.request().url()).pathname
      const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
      if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
      let json: any = []
      if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Kiểm thử', email: 'test@example.com', role, sessionId: 'review-test' }
      else if (path === '/api/staff/exerciseTypes') json = types.slice(0, 1) // Existing service cache may still have only the unrelated categories.
      else if (path === '/api/staff/lessons/9') json = { ...chapter.lessons[1], lessonId: 9, bookId: 6 }
      else if (path === '/api/staff/getAllExcercisesKeywordOfLesson/9') json = rows
      else if (path === '/api/nihongo-user/userExerciseAttempt') {
        submittedAnswers = route.request().postDataJSON().answers
        json = { totalQuestion: 18, correctCount: 18, wrongCount: 0, correctAnswers }
      }
      await route.fulfill({ headers, json })
    })
    await page.goto(role === 'STAFF' ? '/staff/lesson/9/exercises' : '/course/lesson/9/exercises')
    await expect(page.locator('.exercise-card')).toHaveCount(18)
    await expect(page.locator('.exercise-tab')).toHaveText(['問題1', '問題2', '問題3', '問題4'])
    await expect(page.locator('.book-exercise-heading h3')).toHaveText(['〈文法形式の判断〉', '〈文の組み立て〉', '〈文章の文法〉', '〈聴解〉'])
    await expect(page.getByText('Unrelated exercise category')).toHaveCount(0)
    await expect(page.locator('.exercise-card').first().locator('.answer-item').first()).toHaveText('1 始めて')
    await expect(page.locator('.shared-reading')).toContainText('水族館')
    await expect(page.locator('audio')).toHaveCount(3)
    await expect(page.locator('.exercise-card').last().locator('.answer-item')).toHaveCount(3)
    await expect(page.locator('.exercise-card').last().locator('.answer-item')).toHaveText(['1', '2', '3'])
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (role === 'STAFF') {
      await expect(page.locator('.answer-item.correct')).toHaveCount(18)
      await page.getByRole('button', { name: '問題4', exact: true }).click()
      const audio = page.locator('audio')
      await audio.nth(0).evaluate((el: HTMLAudioElement) => el.play())
      await expect.poll(() => audio.nth(0).evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0)
      await expect.poll(() => audio.nth(0).evaluate((el: HTMLAudioElement) => el.duration)).toBeGreaterThan(90)
      await audio.nth(1).evaluate((el: HTMLAudioElement) => el.play())
      await expect.poll(() => audio.nth(0).evaluate((el: HTMLAudioElement) => el.paused)).toBe(true)
      await audio.nth(1).evaluate((el: HTMLAudioElement) => { el.currentTime = 10; el.pause() })
      await expect.poll(() => audio.nth(1).evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThanOrEqual(10)
      await audio.nth(2).evaluate((el: HTMLAudioElement) => el.play())
      await expect.poll(() => audio.nth(2).evaluate((el: HTMLAudioElement) => el.duration)).toBeGreaterThan(51)
      await audio.nth(2).evaluate((el: HTMLAudioElement) => el.pause())
      const mediaUrl = await audio.nth(0).getAttribute('src')
      const partial = await page.request.get(mediaUrl!, { headers: { Range: 'bytes=0-127' } })
      expect(partial.status()).toBe(206)
      expect((await partial.body()).length).toBe(128)
      await page.locator('#book-listening').scrollIntoViewIfNeeded()
      await page.screenshot({ path: '../imports/try-n3/listening-preview.png' })
      await page.locator('.shared-reading').scrollIntoViewIfNeeded()
      await page.screenshot({ path: '../imports/try-n3/review-cloze.png' })
      await page.locator('.exercise-card').first().getByRole('button', { name: '✏️ Sửa', exact: true }).click()
      await expect(page.locator('.exercise-type-select')).toHaveValue('20')
    } else {
      await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
      for (let i = 0; i < questions.length; i++) {
        await page.locator('.exercise-card').nth(i).locator('.answer-item').nth('ABCD'.indexOf(questions[i].correctAnswer)).click()
      }
      await page.locator('.submit-btn').click()
      await expect.poll(() => submittedAnswers).toEqual(correctAnswers)
      await expect(page.locator('.result-mask')).toBeVisible()
    }
  })
}
