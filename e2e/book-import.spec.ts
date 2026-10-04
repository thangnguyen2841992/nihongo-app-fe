import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test.use({ headless: true, channel: process.platform === 'win32' ? 'msedge' : undefined, viewport: { width: 1440, height: 1000 } })
const id = '11111111-1111-4111-8111-111111111111', audioId = '22222222-2222-4222-8222-222222222222'
const headers = { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS' }

test('shows partial TRY N4 lessons while AI is still processing', async ({ page }) => {
  const summary = { id, bookName: 'TRY N4', state: 'ANALYZING', autoMode: 'AUTO', pageCount: 12, processedPages: 12, aiProcessedPages: 6, aiCompleted: false, version: 2, message: 'Đang tạo nội dung.' }
  let reads = 0
  await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    let json: any = []
    if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, role: 'STAFF', name: 'Test', sessionId: 'partial-n4' }
    else if (path.endsWith('/levels')) json = [{ levelId: 1, levelName: 'N4' }]
    else if (path.endsWith('/types')) json = [{ typeId: 1, typeName: 'Ngữ pháp' }]
    else if (path.endsWith('/capabilities')) json = { geminiConfigured: true }
    else if (path === '/api/staff/book-imports') json = [summary]
    else if (path.endsWith('/pages/1')) { await route.fulfill({ headers, contentType: 'image/png', body: readFileSync(new URL('../../nihongo-staff/src/main/resources/imports/try-n3/pages/15.png', import.meta.url)) }); return }
    else if (path.endsWith(id)) {
      reads++
      json = { summary, content: { bookName: 'TRY N4', levelId: 1, typeId: 1, description: '', audio: [], lessons: reads > 1 ? [{ name: 'Bài N4 đầu tiên', description: '', firstPage: 1, lastPage: 6, reading: '日本語を勉強します。', audioId: '', grammars: [], exercises: [] }] : [] }, pages: [{ number: 1, text: '' }] }
    }
    await route.fulfill({ headers, json })
  })
  await page.goto(`/staff/imports/books?id=${id}`)
  await expect(page.locator('.quick-review')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('.reading-preview')).toContainText('日本語を勉強します。')
  await expect(page.getByRole('button', { name: '3. Duyệt và nhập sách' })).toBeDisabled()
  await expect(page.locator('progress')).toBeVisible()
})

test('uploads, edits, resumes and reviews a PDF/audio draft before publishing', async ({ page }) => {
  let detail: any = { summary: { id, fileName: 'test.pdf', bookName: 'Sách kiểm thử', state: 'REVIEW', pageCount: 1, processedPages: 1, message: 'Hãy đối chiếu nội dung với trang gốc.', bookId: null, version: 1 }, content: { bookName: 'Sách kiểm thử', levelId: 1, typeId: 1, description: '', audio: [], lessons: [] }, pages: [{ number: 1, method: 'WINDOWS_OCR', text: '明るいうちに帰る。' }] }
  let created = false, published = 0
  const failures: string[] = []
  page.on('pageerror', e => failures.push(e.message))
  await page.route(url => url.pathname.startsWith('/ws'), route => route.abort())
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname, method = route.request().method()
    if (method === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    let json: any = []
    if (path === '/api/auth/checkLogin') json = { isLoggedIn: true, role: 'STAFF', name: 'Kiểm thử', email: 'test@example.com', sessionId: 'generic-import-test' }
    else if (path.endsWith('/levels')) json = [{ levelId: 1, levelName: 'N3' }]
    else if (path.endsWith('/types')) json = [{ typeId: 1, typeName: 'Ngữ pháp' }]
    else if (path.endsWith('/pages/1')) { await route.fulfill({ headers, contentType: 'image/png', body: readFileSync(new URL('../../nihongo-staff/src/main/resources/imports/try-n3/pages/15.png', import.meta.url)) }); return }
    else if (path === '/api/staff/book-imports' && method === 'GET') json = created ? [detail.summary] : []
    else if (path === '/api/staff/book-imports' && method === 'POST') { created = true; json = detail }
    else if (path.endsWith('/audio') && method === 'POST') { detail.content.audio = [{ id: audioId, name: '01.wav', mediaType: 'audio/wav', bytes: 44 }]; detail.summary.version++; json = detail }
    else if (path.endsWith('/publish')) { published++; detail.summary.state = 'IMPORTED'; detail.summary.bookId = 100; detail.summary.version++; json = detail }
    else if (path.endsWith(id) && method === 'PUT') {
      const body = route.request().postDataJSON()
      expect(body.version).toBe(detail.summary.version)
      detail.content = body.content; detail.summary.version++; detail.summary.state = body.reviewed ? 'READY' : 'REVIEW'; json = detail
    } else if (path.endsWith(id)) json = detail
    await route.fulfill({ headers, json })
  })
  await page.goto('/staff/imports/books')
  await page.locator('input[type=file]').first().setInputFiles({ name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nTest fixture') })
  await page.getByLabel('Tên sách').fill('Sách kiểm thử')
  await page.getByLabel('Trình độ').selectOption('1'); await page.getByLabel('Loại sách').selectOption('1')
  await page.getByRole('button', { name: 'Tải PDF và tạo bản nháp' }).click()
  await expect(page.locator('.source-panel img')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nhập thành sách' })).toBeDisabled()
  await page.locator('.draft-card input[type=file][multiple]').setInputFiles({ name: '01.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(44) })
  await expect(page.getByRole('status')).toContainText('Đã thêm 1 file nghe')
  await page.getByRole('button', { name: 'Tạo bài từ các trang này' }).click()
  await expect(page.getByLabel('Bài đọc', { exact: true })).toHaveValue('明るいうちに帰る。')
  await page.getByLabel('File nghe của bài đọc').selectOption(audioId)
  await expect(page.locator('audio').first()).toHaveAttribute('crossorigin', 'use-credentials')
  await page.getByRole('button', { name: 'Ngữ pháp (0)' }).click(); await page.getByRole('button', { name: '+ Ngữ pháp', exact: true }).click()
  await page.getByLabel('Tên ngữ pháp').fill('～うちに'); await page.getByLabel('Cấu trúc và cách dùng').fill('Trong lúc một trạng thái còn tiếp diễn.')
  await page.getByLabel('Ví dụ tiếng Nhật').fill('明るいうちに帰る。'); await page.getByLabel('Dịch tiếng Việt').fill('Về khi trời còn sáng.')
  await page.getByRole('button', { name: 'Bài tập (0)' }).click(); await page.getByRole('button', { name: '+ Câu hỏi', exact: true }).click()
  await page.getByLabel('Nội dung câu hỏi').fill('明るい（　）帰る。'); await page.getByLabel('Lựa chọn 1').fill('うちに'); await page.getByLabel('Lựa chọn 2').fill('だけ')
  await page.getByLabel('Đáp án đúng').selectOption('A'); await page.getByLabel('File nghe của câu hỏi').selectOption(audioId)
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Đã lưu bản nháp')
  await page.reload(); await expect(page.getByLabel('Tên bài')).toHaveValue('Bài 1')
  await page.getByRole('button', { name: 'Bài tập (1)' }).click(); await expect(page.getByLabel('Đáp án đúng')).toHaveValue('A')
  await page.getByRole('checkbox', { name: 'Tôi đã đối chiếu' }).check(); await page.getByRole('button', { name: 'Duyệt nội dung', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Nhập thành sách' })).toBeEnabled()
  await page.locator('.item-card .book-audio select').selectOption('0.75')
  await expect(page.getByRole('button', { name: 'Nhập thành sách' })).toBeEnabled()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '../.local/startup-check/book-import-editor.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Menu quản lý', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Đóng menu', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Đóng menu', exact: true }).click()
  await page.getByRole('button', { name: 'Nhập thành sách' }).click(); await expect(page.getByRole('link', { name: 'Mở sách đã nhập' })).toHaveAttribute('href', '/staff/books/100')
  await page.reload(); await expect(page.getByRole('button', { name: 'Nhập thành sách' })).toHaveCount(0)
  expect(published).toBe(1); expect(failures).toEqual([])
})

test('explains when the running service has not received the new feature', async ({ page }) => {
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    if (path === '/api/auth/checkLogin') { await route.fulfill({ headers, json: { isLoggedIn: true, role: 'STAFF', name: 'Test', sessionId: 'generic-error-test' } }); return }
    await route.fulfill({ headers, status: path.endsWith('/book-imports') ? 404 : 200, json: [] })
  })
  await page.goto('/staff/imports/books')
  await expect(page.getByRole('alert')).toContainText('khởi động lại dịch vụ quản lý sách')
})

test('Gemini fills the draft and track links; only the missing answer needs editing before one-click import', async ({ page }) => {
  const readingId='33333333-3333-4333-8333-333333333333'
  let detail: any={summary:{id,fileName:'auto.pdf',bookName:'Nhập tự động',state:'REVIEW',pageCount:1,processedPages:1,version:1,autoMode:'AUTO',aiProcessedPages:1,aiCompleted:true,message:'Đã tạo bản nháp tự động.',bookId:null},content:{bookName:'Nhập tự động',levelId:1,typeId:1,description:'',audio:[],lessons:[{name:'Bài 1',description:'',firstPage:1,lastPage:1,reading:'富士山に登った。',audioId:'',grammars:[{title:'～始める',description:'Bắt đầu một hành động.',examples:[{nihongo:'桜の花が咲き始めました。',vietnamese:'Hoa anh đào đã bắt đầu nở.'}]}],exercises:[{groupName:'Ôn tập',contentNihongo:'1. 正しいものを選ぶ。',answerA:'一',answerB:'二',answerC:'',answerD:'',correctAnswer:'',audioId:''}]}]},pages:[{number:1,method:'IMAGE',text:''}],warnings:['Câu 1 chưa tìm thấy đáp án trong nguồn.']}
  let received=false, approved=0,published=0
  await page.route(url=>url.pathname.startsWith('/ws'),route=>route.abort())
  await page.route(url=>url.pathname.startsWith('/api/'),async route=>{
    const path=new URL(route.request().url()).pathname, method=route.request().method()
    if(method==='OPTIONS'){await route.fulfill({status:204,headers});return}
    let json:any=[]
    if(path==='/api/auth/checkLogin')json={isLoggedIn:true,role:'STAFF',sessionId:'auto-draft-test',name:'Kiểm thử'}
    else if(path.endsWith('/levels'))json=[{levelId:1,levelName:'N3'}]
    else if(path.endsWith('/types'))json=[{typeId:1,typeName:'Ngữ pháp'}]
    else if(path.endsWith('/capabilities'))json={geminiConfigured:true}
    else if(path.endsWith('/pages/1')){await route.fulfill({headers,contentType:'image/png',body:readFileSync(new URL('../../nihongo-staff/src/main/resources/imports/try-n3/pages/15.png',import.meta.url))});return}
    else if(path==='/api/staff/book-imports' && method==='GET')json=received?[detail.summary]:[]
    else if(path==='/api/staff/book-imports' && method==='POST'){expect(route.request().postData()).toContain('name="automatic"');received=true;json=detail}
    else if(path.endsWith('/assist-question')){
      const body=route.request().postDataJSON();expect(body.question.correctAnswer).toBe('');expect(body.sourcePage).toBe(1)
      json={...body.question,correctAnswer:'B',basis:'REASONING',sourcePage:0,evidence:'',explanation:'AI đề xuất lựa chọn 2 dựa trên nội dung câu hỏi; cần đối chiếu thêm.',warnings:['Đây là AI tự giải, chưa có đáp án từ sách.']}
    }
    else if(path.endsWith('/audio') && method==='POST'){
      detail.content.audio=[{id:readingId,name:'02 Track 02.wav',mediaType:'audio/wav',bytes:44},{id:audioId,name:'04 Track 04.wav',mediaType:'audio/wav',bytes:44}]
      detail.content.lessons[0].audioId=readingId;detail.content.lessons[0].exercises[0].audioId=audioId;detail.summary.version++;json=detail
    }else if(path.endsWith(id) && method==='PUT'){
      const body=route.request().postDataJSON();expect(body.version).toBe(detail.summary.version);detail.content=body.content;detail.summary.version++;detail.summary.state=body.reviewed?'READY':'REVIEW';if(body.reviewed)approved++;json=detail
    }else if(path.endsWith('/publish')){expect(detail.summary.state).toBe('READY');published++;detail.summary.state='IMPORTED';detail.summary.bookId=101;json=detail}
    else if(path.endsWith(id))json=detail
    await route.fulfill({headers,json})
  })
  await page.goto('/staff/imports/books');await expect(page.getByLabel('Tự tạo nội dung bằng Gemini',{exact:false})).toBeChecked()
  await page.locator('input[type=file]').first().setInputFiles({name:'auto.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 test')})
  await page.getByLabel('Trình độ').selectOption('1');await page.getByLabel('Loại sách').selectOption('1')
  await page.locator('.initial-audio input').setInputFiles([{name:'02 Track 02.wav',mimeType:'audio/wav',buffer:Buffer.alloc(44)},{name:'04 Track 04.wav',mimeType:'audio/wav',buffer:Buffer.alloc(44)}])
  await page.getByRole('button',{name:'Tải PDF và tạo bản nháp'}).click()
  await expect(page.locator('.reading-preview')).toContainText('富士山に登った。')
  await expect(page.locator('.reading-preview audio')).toHaveAttribute('src',`http://localhost:8082/api/staff/book-imports/${id}/audio/${readingId}`)
  await page.locator('.reading-preview summary').filter({hasText:'～始める'}).click();await expect(page.locator('.reading-preview')).toContainText('Hoa anh đào đã bắt đầu nở.')
  await page.getByRole('checkbox',{name:'Tôi đã đối chiếu'}).check();await expect(page.getByRole('button',{name:'3. Duyệt và nhập sách'})).toBeDisabled()
  await page.locator('.reading-preview summary').filter({hasText:'Bài tập (1)'}).click();await page.getByRole('button',{name:'Đối chiếu câu này'}).click()
  await page.getByRole('button',{name:'Nhờ AI hỗ trợ',exact:true}).click()
  await expect(page.locator('.ai-suggestion')).toContainText('AI tự giải')
  await expect(page.getByLabel('Đáp án đúng')).toHaveValue('')
  expect(detail.content.lessons[0].exercises[0].correctAnswer).toBe('')
  await page.getByLabel('Nội dung câu hỏi').fill('Câu đã được sửa sau khi AI đề xuất')
  await expect(page.getByRole('button',{name:'Áp dụng đề xuất vào câu này'})).toBeDisabled()
  await page.getByLabel('Nội dung câu hỏi').fill('1. 正しいものを選ぶ。')
  await page.locator('.ai-suggestion').scrollIntoViewIfNeeded();await page.screenshot({path:'../.local/startup-check/book-question-assistant.png'})
  await page.getByRole('button',{name:'Áp dụng đề xuất vào câu này'}).click()
  await expect(page.getByLabel('Đáp án đúng')).toHaveValue('B')
  await expect(page.getByLabel('File nghe của câu hỏi')).toHaveValue(audioId)
  await expect(page.getByRole('checkbox',{name:'Tôi đã đối chiếu'})).not.toBeChecked()
  await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click()
  await expect(page.locator('.quick-review')).toContainText('Nội dung đã đủ để đối chiếu')
  await page.getByRole('checkbox',{name:'Tôi đã đối chiếu'}).check();await expect(page.getByRole('button',{name:'3. Duyệt và nhập sách'})).toBeEnabled()
  await page.locator('.quick-review').scrollIntoViewIfNeeded();await page.screenshot({path:'../.local/startup-check/book-import-ai-preview.png'})
  await page.getByRole('button',{name:'3. Duyệt và nhập sách'}).click();await expect(page.getByRole('link',{name:'Mở sách đã nhập'})).toHaveAttribute('href','/staff/books/101')
  expect(approved).toBe(1);expect(published).toBe(1)
})
