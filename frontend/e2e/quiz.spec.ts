import { test, expect } from '@playwright/test';
const api = process.env.QA_BACKEND_URL!;
async function login(request: any, role = 'user') {
  const response = await request.post(`${api}/auth/login`, {data:{username:`qa_${role}`,matKhau:process.env.QA_PASSWORD}});
  expect(response.status()).toBe(200); return response.json();
}
test('registration, role protection, three kinds, grading and score-only policy',async({request})=>{
  const admin=await login(request,'admin');const user=await login(request);const headers={Authorization:`Bearer ${admin.token}`};
  const registered=await request.post(`${api}/auth/register`,{data:{username:`test_${Date.now()}`,matKhau:process.env.QA_PASSWORD,hoTen:'QA registration'}});expect(registered.status()).toBe(200);expect((await registered.json()).vaiTro).toBe('USER');
  expect((await request.post(`${api}/auth/register`,{data:{username:'',matKhau:'',hoTen:''}})).status()).toBe(400);
  expect((await request.get(`${api}/admin/nhom-mon`,{headers:{Authorization:`Bearer ${user.token}`}})).status()).toBe(403);
  const topics=await (await request.get(`${api}/chude/thongke`)).json();const topic=topics.find((t:any)=>t.tenChuDe==='QA Demo');
  const qs=await (await request.get(`${api}/cauhoi/chude/${topic.id}`,{headers})).json();expect(new Set(qs.map((q:any)=>q.loaiCauHoi)).size).toBe(3);
  const play=await (await request.get(`${api}/choi/chude/${topic.id}/cauhoi`)).json();expect(JSON.stringify(play)).not.toMatch(/laDapAnDung|giaiThich|thuTu/);
  const answers=qs.map((q:any)=>({cauHoiId:q.id,thoiGianTraLoi:5,dapAnId:q.loaiCauHoi==='TRAC_NGHIEM'?q.danhSachDapAn.find((a:any)=>a.laDapAnDung).id:null,cauTraLoiText:q.loaiCauHoi==='DIEN_TU'?'中国':null,thuTuTokenIds:q.loaiCauHoi==='SAP_XEP'?[...q.danhSachDapAn].sort((a:any,b:any)=>a.thuTu-b.thuTu).map((a:any)=>a.id):null}));
  const submission={chuDeId:topic.id,tenNguoiChoi:'QA test',thoiGianLam:15,danhSachTraLoi:answers};const result=await (await request.post(`${api}/choi/nopbai`,{data:submission})).json();expect(result.diemSo).toBe(qs.length*250);expect(result.soCauDung).toBe(qs.length);
  const config=await (await request.get(`${api}/chude/${topic.id}`)).json();expect((await request.put(`${api}/chude/${topic.id}`,{headers,data:{...config,hienDapAnSauNop:false,choPhepXemDapAn:false}})).status()).toBe(200);
  const hidden=await (await request.post(`${api}/choi/nopbai`,{data:submission})).json();expect(hidden.danhSachCauHoi).toEqual([]);expect((await request.post(`${api}/choi/luyentap/${qs[0].id}`,{data:answers[0]})).status()).toBe(403);
  expect((await request.put(`${api}/chude/${topic.id}`,{headers,data:config})).status()).toBe(200);
  const created=await request.post(`${api}/admin/nhom-mon`,{headers,data:{ten:`QA API ${Date.now()}`,thuTu:4,hienThi:true}});expect(created.status()).toBe(200);const group=await created.json();
  expect((await request.put(`${api}/admin/nhom-mon/${group.id}`,{headers,data:{...group,hienThi:false}})).status()).toBe(200);expect((await (await request.get(`${api}/nhom-mon`)).json()).some((g:any)=>g.id===group.id)).toBe(false);
  expect((await request.delete(`${api}/admin/nhom-mon/${group.id}`,{headers})).status()).toBe(200);
  for(const kind of ['TRAC_NGHIEM','DIEN_TU','SAP_XEP']) {
    const source=qs.find((q:any)=>q.loaiCauHoi===kind);const create=await request.post(`${api}/cauhoi`,{headers,data:{...source,id:undefined,chuDe:{id:topic.id},noiDungCauHoi:`QA CRUD ${kind}`}});expect(create.status()).toBe(200);const question=await create.json();
    expect((await request.put(`${api}/cauhoi/${question.id}`,{headers,data:{...question,noiDungCauHoi:`QA edited ${kind}`}})).status()).toBe(200);expect((await (await request.get(`${api}/cauhoi/${question.id}`,{headers})).json()).noiDungCauHoi).toBe(`QA edited ${kind}`);expect((await request.delete(`${api}/cauhoi/${question.id}`,{headers})).status()).toBe(204);
  }
});
test('customer plays all kinds, flags, countdown, F5 draft and submit modal',async({page,request})=>{
  const user=await login(request);await page.addInitScript(u=>localStorage.setItem('quiz_auth',JSON.stringify(u)),user);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.getByRole('heading',{name:'QA Demo',exact:true}).click();await expect(page.getByRole('heading',{name:'QA: Thủ đô Việt Nam?'})).toBeVisible();
  if (page.viewportSize()!.width >= 1024) {
    const main=await page.locator('.quiz-main').boundingBox(); const side=await page.locator('.quiz-sidebar').boundingBox(); const layout=await page.locator('.quiz-layout').boundingBox();
    expect(main!.width/(main!.width+side!.width)).toBeCloseTo(.67,2); expect(side!.x).toBeGreaterThan(main!.x+main!.width); expect(layout!.width).toBeGreaterThan(page.viewportSize()!.width*.94);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({path:`test-results/quiz-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:/Hà Nội/}).click();
  const flag=page.getByTitle('Đánh dấu câu này để xem lại sau');await flag.click();
  const next=page.getByRole('button',{name:/Câu tiếp|Tiếp theo/}).first();await next.click();
  await page.getByPlaceholder(/Nhập.*trả lời|Nhập.*đáp án|Nhập.*từ/i).fill('中国');
  await page.reload();await expect(page.getByPlaceholder(/Nhập.*trả lời|Nhập.*đáp án|Nhập.*từ/i)).toHaveValue('中国');
  await page.getByRole('button',{name:/Câu tiếp|Tiếp theo/}).first().click();
  for(const word of ['我','学习','中文'])await page.getByRole('button',{name:word,exact:true}).click();
  await page.getByRole('button',{name:/Nộp bài/}).first().click();await expect(page.getByRole('heading',{name:/Nộp bài|nộp bài/})).toBeVisible();await page.getByRole('button',{name:'Xác nhận nộp bài',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Xem lại bài làm'})).toBeVisible();
  await page.getByRole('button',{name:'🎮 Chủ đề khác',exact:true}).click(); await page.getByRole('button',{name:'Kết quả',exact:true}).click(); await expect(page.getByRole('heading',{name:'Xem lại bài làm'})).toBeVisible();
  await page.getByRole('button',{name:'🎮 Chủ đề khác',exact:true}).click(); await page.getByRole('button',{name:'Tài khoản',exact:true}).click(); await page.getByRole('button',{name:'Đăng xuất',exact:true}).click(); await expect(page.getByRole('button',{name:'Kết quả',exact:true})).toBeDisabled(); expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('admin can edit groups, three question types and preview DOCX import',async({page,request})=>{
  const admin=await login(request,'admin');await page.goto('/');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click(); await page.getByPlaceholder('ten_dang_nhap').fill('qa_admin'); await page.getByPlaceholder('••••••••').fill(process.env.QA_PASSWORD!); await page.getByRole('button',{name:'🚀 Đăng nhập',exact:true}).click();
  await page.getByRole('button',{name:'Quản trị',exact:true}).click();
  async function checkAdminLayout() { if (page.viewportSize()!.width < 1024) return; const content=await page.locator('.admin-content').boundingBox(); const main=await page.locator('.admin-shell > main').boundingBox(); expect(content!.width).toBeCloseTo(main!.width,0); expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  async function navigate(label:string) { const button=page.getByRole('button',{name:label,exact:true}); if(!await button.isVisible()) await page.getByRole('button',{name:'Mở/đóng menu quản trị'}).click(); await button.click(); }
  await navigate('▣ Quản lý môn học');
  await expect(page.getByRole('heading',{name:'Quản lý nhóm môn'})).toBeVisible();await page.getByLabel('Tên nhóm').fill(`QA Group ${Date.now()}`);await page.getByRole('button',{name:'Lưu nhóm',exact:true}).click();await expect(page.getByLabel('Tên nhóm')).toHaveValue('');
  await checkAdminLayout();
  await page.screenshot({path:`test-results/admin-subjects-${test.info().project.name}.png`,fullPage:true});
  await navigate('+ Tạo câu hỏi');
  await checkAdminLayout();
  await page.screenshot({path:`test-results/admin-create-${test.info().project.name}.png`,fullPage:true});
  await page.getByLabel('Dạng câu hỏi').first().selectOption('DIEN_TU');await page.getByLabel('Nội dung câu hỏi').first().fill('QA new fill');await page.getByLabel('Đáp án/token 1').first().fill('中国');await page.getByRole('button',{name:'Lưu câu hỏi',exact:true}).click();await expect(page.getByText('QA new fill',{exact:false}).last()).toBeVisible();
  const response=await request.get(`${api}/admin/import/template?format=docx&type=SAP_XEP`,{headers:{Authorization:`Bearer ${admin.token}`}});expect(response.status()).toBe(200);
  await navigate('⇧ Import câu hỏi');
  await checkAdminLayout();
  await page.screenshot({path:`test-results/admin-import-${test.info().project.name}.png`,fullPage:true});
  await page.getByLabel('File nhập câu hỏi').setInputFiles({name:'qa.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await response.body()});await expect(page.getByRole('button',{name:/Xác nhận lưu 1 câu/})).toBeVisible();
  await page.getByLabel('Nội dung câu hỏi').fill(''); await expect(page.getByRole('button',{name:/Xác nhận lưu 1 câu/})).toBeDisabled();
  await page.getByLabel('Nội dung câu hỏi').fill('QA edited import 中文');
  await expect(page.getByRole('button',{name:/Xác nhận lưu 1 câu/})).toBeEnabled();await page.getByRole('button',{name:/Xác nhận lưu 1 câu/}).click();await expect(page.getByRole('status')).toContainText('Đã lưu 1 câu');
  await navigate('⚙ Cấu hình đề thi'); await page.getByRole('button',{name:'Lưu cấu hình',exact:true}).click(); await expect(page.getByRole('status')).toContainText('Đã lưu cấu hình');
  await navigate('☷ Danh sách câu hỏi'); await page.getByLabel('Tìm kiếm câu hỏi').fill('QA new fill'); await expect(page.getByRole('cell',{name:'QA new fill',exact:true}).first()).toBeVisible();
  await checkAdminLayout();
  await page.screenshot({path:`test-results/admin-list-${test.info().project.name}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
