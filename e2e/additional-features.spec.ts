import { test, expect, type Page } from '@playwright/test'
test.use({headless:true,channel:process.platform==='win32'?'msedge':undefined,viewport:{width:1440,height:1000}})
const learner='00000000-0000-0000-0000-000000000002',teacher='00000000-0000-0000-0000-000000000001'
const paged=<T,>(content:T[])=>({content,number:0,totalPages:content.length?1:0,totalElements:content.length})
async function setup(page:Page,role:string){
 const state={authenticated:role!=='PUBLIC',classes:[] as any[],members:[] as any[],assignments:[] as any[],refunds:[] as any[],retry:0,attempt:{id:7,assignmentId:1,title:'Kiểm tra N3',version:0,serverNow:Date.now(),endsAt:Date.now()+1800000,finished:false,correct:0,total:1,score:0,answersVisible:false,questions:[{id:10,content:'日本は？',answerA:'A',answerB:'B',answerC:'C',answerD:'D',chosen:null as string|null,correctAnswer:null}]}}
 await page.route(url=>url.pathname.startsWith('/ws'),route=>route.abort())
 await page.route(url=>url.pathname.startsWith('/api/'),async route=>{
  const path=new URL(route.request().url()).pathname,method=route.request().method(),body=method==='GET'?{}:route.request().postDataJSON()||{},reply=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'http://localhost:5173','Access-Control-Allow-Credentials':'true'},body:JSON.stringify(data)})
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'http://localhost:5173','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}})
  if(path==='/api/auth/checkLogin')return state.authenticated?reply({isLoggedIn:true,userId:role==='USER'?learner:teacher,name:'Demo',email:'demo@example.test',role:role==='PUBLIC'?'STAFF':role,sessionId:'demo-session',accessExpiresAt:Date.now()+300000}):reply({isLoggedIn:false},401)
  if(path==='/api/auth/refresh')return reply({},state.authenticated?200:401)
  if(path==='/api/auth/checkEmail')return reply({type:'LOCAL'})
  if(path==='/api/auth/login')return reply({mfaRequired:true},202)
  if(path==='/api/auth/mfa/verify'){state.authenticated=true;return reply({message:'success'})}
  if(path==='/api/auth/activity')return reply({})
  if(path==='/api/nihongo-user/courses')return reply([{courseId:1,courseName:'N3'}])
  if(path==='/api/staff/content/exams')return reply(paged([{id:1,title:'Đề N3',questions:1}]))
  if(path==='/api/users/staff/learners/search')return reply(paged([{userId:learner,name:'Learner',email:'learner@example.test'}]))
  if(path==='/api/users/staff/learner-members'||path==='/api/users/staff/learners')return reply([{userId:learner,name:'Learner',email:'learner@example.test'}])
  if(path==='/api/nihongo-user/staff/classrooms'){if(method==='POST'){const row={id:1,owner:teacher,...body,archived:false,version:0};state.classes.push(row);return reply(row)}return reply(paged(state.classes))}
  if(path==='/api/nihongo-user/staff/classrooms/1/members'){if(method==='POST'){state.members=[{id:1,userId:learner,joinedAt:new Date().toISOString()}];return reply({})}return reply(paged(state.members))}
  if(path==='/api/nihongo-user/staff/classrooms/1/assignments'){if(method==='POST'){state.assignments=[{id:1,classroomId:1,...body,published:false,version:0}];return reply(state.assignments[0])}return reply(paged(state.assignments))}
  if(path==='/api/nihongo-user/staff/assignments/1/publish'){state.assignments[0].published=true;state.assignments[0].version=1;return reply(state.assignments[0])}
  if(path==='/api/nihongo-user/staff/assignments/1/results')return reply(paged([]))
  if(path==='/api/nihongo-user/study/assignments')return reply(paged([{id:1,classroomId:1,title:'Kiểm tra N3',kind:'EXAM',minutes:30,startsAt:new Date(Date.now()-60000).toISOString(),dueAt:new Date(Date.now()+3600000).toISOString(),published:true,version:0}]))
  if(path==='/api/nihongo-user/study/assignments/1/start')return reply(state.attempt)
  if(path==='/api/nihongo-user/study/attempts/7')return reply({...state.attempt,serverNow:Date.now()})
  if(path==='/api/nihongo-user/study/attempts/7/feedback')return reply(paged([]))
  if(path==='/api/nihongo-user/study/attempts/7/answers'){state.attempt.version++;state.attempt.questions[0]!.chosen=body.answers['10'];return reply({...state.attempt,serverNow:Date.now()})}
  if(path==='/api/nihongo-user/study/attempts/7/submit'){state.attempt.finished=true;state.attempt.correct=body.answers['10']==='C'?1:0;state.attempt.score=state.attempt.correct*100;state.attempt.version++;return reply({...state.attempt,serverNow:Date.now()})}
  if(path==='/api/nihongo-user/admin/refunds/purchases')return reply(paged([{id:4,userId:learner,courseId:1,amount:9000,createdAt:new Date().toISOString(),renewal:false}]))
  if(path==='/api/nihongo-user/admin/refunds'){if(method==='POST'){state.refunds=[{id:1,...body,userId:learner,amount:9000,status:'PENDING',requestedBy:teacher,version:0}];return reply(state.refunds[0])}return reply(paged(state.refunds))}
  if(path==='/api/nihongo-user/admin/refunds/1/review'){state.refunds[0].status=body.approve?'APPROVED':'REJECTED';state.refunds[0].reviewNote=body.note;return reply(state.refunds[0])}
  if(path.endsWith('/operations'))return reply({service:'demo',pending:1,serverTime:Date.now()})
  if(path.endsWith('/operations/queue'))return reply(paged([{id:'job',attempts:1,nextAttempt:Date.now(),expiresAt:Date.now()+600000,leased:false}]))
  if(path.endsWith('/operations/queue/job/retry')){state.retry++;return reply({})}
  if(path==='/api/nihongo-user/wallets/me')return reply({walletId:1,balance:50000})
  if(path==='/api/nihongo-user/wallets/notifications')return reply([])
  return reply([])
 })
 return state
}
test('login waits for MFA before opening the staff workspace',async({page})=>{await setup(page,'PUBLIC');await page.goto('/login');await page.getByPlaceholder('Email',{exact:true}).fill('demo@example.test');await page.getByRole('button',{name:/Tiếp tục/}).click();await page.locator('input[type="password"]').fill('Strong1!pass');await page.getByRole('button',{name:/Đăng nhập/,exact:true}).click();await expect(page.getByLabel('Mã xác thực hai bước')).toBeVisible();await page.getByLabel('Mã xác thực hai bước').fill('123456');await page.getByRole('button',{name:'Xác minh và đăng nhập'}).click();await expect(page).toHaveURL(/\/staff/)} )
test('staff creates a class, adds learners and publishes a timed assignment',async({page})=>{const state=await setup(page,'STAFF');await page.goto('/staff/classrooms');await page.getByLabel('Tên lớp',{exact:true}).fill('Lớp N3');await page.getByLabel('Khóa học').selectOption('1');await page.getByRole('button',{name:'Tạo lớp',exact:true}).click();await page.getByRole('checkbox',{name:/Learner/}).check();await page.getByRole('button',{name:'Thêm 1 học viên'}).click();await expect(page.getByRole('cell',{name:'learner@example.test'})).toBeVisible();await page.getByLabel('Tiêu đề',{exact:true}).fill('Kiểm tra N3');await page.getByLabel('Đề từ ngân hàng').selectOption('1');await page.getByLabel('Mở lúc').fill('2026-10-12T09:00');await page.getByLabel('Hạn nộp').fill('2026-10-12T12:00');await page.getByRole('button',{name:'Lưu bản nháp'}).click();await page.getByRole('button',{name:'Giao đề',exact:true}).click();await expect(page.getByRole('cell',{name:'Đã giao',exact:true})).toBeVisible();expect(state.assignments[0].minutes).toBe(30)})
test('learner saves and submits without receiving answer keys before the deadline',async({page})=>{const state=await setup(page,'USER');await page.goto('/user/assignments');await page.getByRole('button',{name:'Bắt đầu / Tiếp tục / Xem kết quả'}).click();await expect(page.getByRole('heading',{name:'Kiểm tra N3'})).toBeVisible();await page.locator('input[value="C"]').check();await page.getByRole('button',{name:'Lưu đáp án',exact:true}).click();await expect(page.getByText('Đã lưu đáp án.',{exact:true})).toBeVisible();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Nộp bài',exact:true}).click();await expect(page.getByRole('heading',{name:'Kết quả: 100 / 100'})).toBeVisible();await expect(page.getByText(/Đáp án sẽ mở sau hạn làm đề/)).toBeVisible();expect(state.attempt.questions[0]!.correctAnswer).toBeNull()})
test('admin requests and approves a refund and retries only a pending job',async({page})=>{const state=await setup(page,'ADMIN');await page.goto('/admin/refunds');await page.getByRole('button',{name:'Chọn',exact:true}).click();await page.getByLabel('Lý do',{exact:true}).fill('Hoàn tiền theo yêu cầu hỗ trợ');await page.getByRole('button',{name:'Tạo yêu cầu',exact:true}).click();await page.getByLabel('Ghi chú duyệt / từ chối').fill('Đã đối chiếu giao dịch thanh toán');page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Duyệt',exact:true}).click();await expect(page.getByRole('cell',{name:'APPROVED',exact:true})).toBeVisible();expect(state.refunds[0].amount).toBe(9000);await page.goto('/admin/operations');await page.getByLabel('Lý do retry (10–500 ký tự)').fill('Đã kiểm tra cấu hình kết nối broker');await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByText('Đã đưa tác vụ về lịch xử lý gần nhất.')).toBeVisible();expect(state.retry).toBe(1)})
