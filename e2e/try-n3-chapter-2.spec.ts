import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined, viewport: { width: 1440, height: 1000 } })
const chapter = JSON.parse(readFileSync(new URL('../../imports/try-n3/chapter-2.json', import.meta.url), 'utf8'))
for (const role of ['STAFF', 'USER']) {
  test(`${role}: keeps chapter 2 sections, passage, audio and original answer key`, async ({ page }) => {
    let submitted: Record<string, string> | undefined
    const questions = chapter.lessons[1].exercises
    const correct = Object.fromEntries(questions.map((q: any, i: number) => [201+i, q.correctAnswer]))
    await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const path = new URL(route.request().url()).pathname
      const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
      if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
      let json: any = []
      if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Kiểm thử', email: 'test@example.com', role, sessionId: 'chapter-2-test' }
      else if (path === '/api/staff/lessons/11') json = { ...chapter.lessons[1], lessonId: 11, bookId: 6 }
      else if (path === '/api/staff/getAllExcercisesKeywordOfLesson/11') json = questions.map((q: any, i: number) => ({ ...q, exerciseKeywordId:201+i, lessonId:11, exerciseTypeId:20+q.sourceSectionNumber, correctAnswer: role === 'STAFF' ? q.correctAnswer : undefined }))
      else if (path === '/api/nihongo-user/userExerciseAttempt') { submitted = route.request().postDataJSON().answers; json = { totalQuestion:18, correctCount:18, wrongCount:0, correctAnswers:correct } }
      await route.fulfill({ headers, json })
    })
    await page.goto(role === 'STAFF' ? '/staff/lesson/11/exercises' : '/course/lesson/11/exercises')
    await expect(page.locator('.exercise-card')).toHaveCount(18)
    await expect(page.locator('.exercise-tab')).toHaveText(['問題1','問題2','問題3','問題4'])
    await expect(page.locator('.book-exercise-heading h3')).toHaveText(['〈文法形式の判断〉','〈文の組み立て〉','〈文章の文法〉','〈聴解〉'])
    await expect(page.locator('.shared-reading')).toContainText('遊園地')
    await expect(page.locator('audio')).toHaveCount(3)
    await expect(page.locator('audio').nth(0)).toHaveAttribute('aria-label','Nghe CD 09')
    await expect(page.locator('audio').nth(1)).toHaveAttribute('aria-label','Nghe CD 10')
    await expect(page.locator('audio').nth(2)).toHaveAttribute('aria-label','Nghe CD 11')
    await expect(page.locator('.exercise-card').last().locator('.answer-item')).toHaveCount(4)
    if (role === 'STAFF') {
      await expect(page.locator('.answer-item.correct')).toHaveCount(18)
      await page.getByRole('button', {name:'問題4',exact:true}).click()
      await page.locator('audio').nth(0).evaluate((el:HTMLAudioElement)=>el.play())
      await expect.poll(()=>page.locator('audio').nth(0).evaluate((el:HTMLAudioElement)=>el.duration)).toBeGreaterThan(114)
      await page.locator('audio').nth(0).evaluate((el:HTMLAudioElement)=>el.pause())
      await page.screenshot({path:'../imports/try-n3/chapter-2-listening.png'})
    } else {
      await page.getByRole('button',{name:'Bắt đầu',exact:true}).click()
      for (let i=0;i<questions.length;i++) await page.locator('.exercise-card').nth(i).locator('.answer-item').nth('ABCD'.indexOf(questions[i].correctAnswer)).click()
      await page.locator('.submit-btn').click()
      await expect.poll(()=>submitted).toEqual(correct)
    }
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
