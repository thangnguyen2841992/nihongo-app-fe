import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined, viewport: { width: 1440, height: 1000 } })

for (const number of [4, 8, 9, 10, 11]) for (const role of ['STAFF', 'USER']) {
  test(`${role}: chapter ${number} retains book sections, listening choices and grading`, async ({ page }) => {
    const chapter = JSON.parse(readFileSync(new URL(`../../imports/try-n3/chapter-${number}.json`, import.meta.url), 'utf8'))
    const part = chapter.lessons.at(-1)
    const questions = part.exercises
    const tracks = questions.filter((q: any) => /^CD \d{2}$/.test(q.contentNihongo)).map((q: any) => q.contentNihongo.slice(-2))
    const correct = Object.fromEntries(questions.map((q: any, i: number) => [201 + i, q.correctAnswer]))
    let submitted: Record<string, string> | undefined
    await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const path = new URL(route.request().url()).pathname
      const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
      if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
      let json: any = []
      if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Kiểm thử', email: 'test@example.com', role, sessionId: 'full-book-test' }
      else if (path === '/api/staff/lessons/11') json = { ...part, lessonId: 11, bookId: 6 }
      else if (path === '/api/staff/getAllExcercisesKeywordOfLesson/11') json = questions.map((q: any, i: number) => ({ ...q, exerciseKeywordId: 201 + i, lessonId: 11, exerciseTypeId: 20 + q.sourceSectionNumber, correctAnswer: role === 'STAFF' ? q.correctAnswer : undefined }))
      else if (path === '/api/nihongo-user/userExerciseAttempt') {
        submitted = route.request().postDataJSON().answers
        json = { totalQuestion: questions.length, correctCount: questions.length, wrongCount: 0, correctAnswers: correct }
      }
      await route.fulfill({ headers, json })
    })
    await page.goto(role === 'STAFF' ? '/staff/lesson/11/exercises' : '/course/lesson/11/exercises')
    await expect(page.locator('.exercise-card')).toHaveCount(questions.length)
    await expect(page.locator('.book-exercise-heading h3')).toHaveText(chapter.reviewLayout.sections.map((s: any) => `〈${s.title}〉`))
    await expect(page.locator('audio')).toHaveCount(tracks.length)
    for (let i = 0; i < tracks.length; i++) await expect(page.locator('audio').nth(i)).toHaveAttribute('aria-label', `Nghe CD ${tracks[i]}`)
    for (let i = 0; i < questions.length; i++) {
      const choices = ['answerA', 'answerB', 'answerC', 'answerD'].filter(k => questions[i][k])
      await expect(page.locator('.exercise-card').nth(i).locator('.answer-item')).toHaveCount(choices.length)
    }
    if (number === 9 || number === 10) {
      const figure = page.locator('.listening-figure img')
      await expect(figure).toHaveAttribute('src', new RegExp(`cd${number === 9 ? '52' : '55'}\\.png$`))
      await figure.scrollIntoViewIfNeeded()
      await expect.poll(() => figure.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(300)
    }
    if (role === 'STAFF') {
      await expect(page.locator('.answer-item.correct')).toHaveCount(questions.length)
      if (number === 11) {
        const last = page.locator('audio').last()
        await last.scrollIntoViewIfNeeded()
        await last.evaluate((audio: HTMLAudioElement) => audio.play())
        await expect.poll(() => last.evaluate((audio: HTMLAudioElement) => audio.duration)).toBeGreaterThan(5)
        await last.evaluate((audio: HTMLAudioElement) => audio.pause())
        await page.screenshot({ path: '../imports/try-n3/chapter-11-listening.png' })
      }
    } else {
      await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
      for (let i = 0; i < questions.length; i++) await page.locator('.exercise-card').nth(i).locator('.answer-item').nth('ABCD'.indexOf(questions[i].correctAnswer)).click()
      await page.locator('.submit-btn').click()
      await expect.poll(() => submitted).toEqual(correct)
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
