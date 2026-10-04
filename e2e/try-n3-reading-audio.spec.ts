import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined, viewport: { width: 1440, height: 1000 } })
const chapter = JSON.parse(readFileSync(new URL('../../imports/try-n3/chapter-1.json', import.meta.url), 'utf8'))
const audioManifest = JSON.parse(readFileSync(new URL('../src/data/try-n3-audio.json', import.meta.url), 'utf8'))

for (const role of ['STAFF', 'USER']) {
  test(`${role}: plays the matching reading and stops audio when changing lessons`, async ({ page }) => {
    let bookName = chapter.bookName
    await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const path = new URL(route.request().url()).pathname
      const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
      if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
      let json: any = []
      if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, name: 'Kiểm thử', email: 'test@example.com', role, sessionId: 'reading-audio-test' }
      else if (path === '/api/staff/books/6') json = { bookId: 6, bookName }
      else if (path === '/api/staff/getLessonsByBook') json = chapter.lessons.map((lesson: any, i: number) => ({ ...lesson, audioTrack: bookName === 'Sách khác' || bookName === 'Sách nhập PDF' ? null : lesson.audioTrack, audioUrl: bookName === 'Sách nhập PDF' ? `/api/staff/imported-audio/lessons/${8 + i}` : null, lessonId: 8 + i, bookId: 6 }))
      else if (path.startsWith('/api/staff/imported-audio/lessons/')) { await route.fulfill({ headers, contentType: 'audio/mp4', body: readFileSync(new URL(`../public/${audioManifest.tracks['02'].path}`, import.meta.url)) }); return }
      await route.fulfill({ headers, json })
    })
    const url = role === 'STAFF' ? '/staff/books/6' : '/course/book/6'
    await page.goto(url)
    const player = page.locator('.lesson-reading-card audio')
    await expect(player).toHaveCount(1)
    await expect(player).toHaveAttribute('aria-label', 'Nghe CD 02')
    await expect(page.locator('.lesson-reading-content')).toContainText('先週の日曜日')
    await expect(player).toHaveAttribute('preload', 'none')
    await player.evaluate((el: HTMLAudioElement) => { (window as any).previousReadingAudio = el; return el.play() })
    await expect.poll(() => player.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0)
    await expect.poll(() => player.evaluate((el: HTMLAudioElement) => el.duration)).toBeGreaterThan(58)
    await page.getByRole('button', { name: 'Bài 2', exact: true }).click()
    await expect(player).toHaveAttribute('aria-label', 'Nghe CD 03')
    await expect(page.locator('.lesson-reading-content')).toContainText('でも、登ってみると')
    expect(await page.evaluate(() => (window as any).previousReadingAudio.paused)).toBe(true)
    expect(await player.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true)
    await player.evaluate((el: HTMLAudioElement) => el.play())
    await expect.poll(() => player.evaluate((el: HTMLAudioElement) => el.duration)).toBeGreaterThan(79)
    await page.locator('.lesson-reading-card select').selectOption('0.75')
    expect(await player.evaluate((el: HTMLAudioElement) => el.playbackRate)).toBe(0.75)
    await player.evaluate((el: HTMLAudioElement) => { el.currentTime = 15; el.pause() })
    expect(await player.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThanOrEqual(15)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (role === 'STAFF') {
      await page.locator('.lesson-reading-card').scrollIntoViewIfNeeded()
      await page.screenshot({ path: '../imports/try-n3/reading-audio-preview.png' })
    }
    // The same lesson titles in another book must not attach these recordings.
    bookName = 'Sách khác'
    await page.reload()
    await expect(page.locator('.lesson-reading-content')).toBeVisible()
    await expect(player).toHaveCount(0)
    bookName = 'Sách nhập PDF'
    await page.reload()
    await expect(player).toHaveAttribute('src', 'http://localhost:8082/api/staff/imported-audio/lessons/8')
    await expect(player).toHaveAttribute('crossorigin', 'use-credentials')
    await player.evaluate((el: HTMLAudioElement) => { (window as any).importedPlayer = el; return el.play() })
    await expect.poll(() => player.evaluate((el: HTMLAudioElement) => el.duration)).toBeGreaterThan(58)
    await page.getByRole('button', { name: 'Bài 2', exact: true }).click()
    await expect(player).toHaveAttribute('src', 'http://localhost:8082/api/staff/imported-audio/lessons/9')
    expect(await page.evaluate(() => (window as any).importedPlayer.paused)).toBe(true)
  })
}
