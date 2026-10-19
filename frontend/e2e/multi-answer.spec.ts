import { test, expect } from '@playwright/test';
const base = process.env.QA_BACKEND_URL!;

test('Admin creates multiple correct answers; USER selects both, restores draft, submits and Admin reviews', async ({page, request}) => {
  async function login(role: string) {
    const r = await request.post(`${base}/auth/login`, {data:{username:`qa_${role}`,matKhau:process.env.QA_PASSWORD}});
    expect(r.status()).toBe(200); return r.json();
  }
  const admin=await login('admin'), user=await login('user');
  const ah={Authorization:`Bearer ${admin.token}`}, uh={Authorization:`Bearer ${user.token}`};
  const groups=await (await request.get(`${base}/admin/nhom-mon`,{headers:ah})).json();
  const title=`Multi QA ${Date.now()}`;
  const topic=await (await request.post(`${base}/chude`,{headers:ah,data:{tenChuDe:title,nhomMon:{id:groups[0].id},hienDapAnSauNop:true,choPhepXemDapAn:true}})).json();
  for (const format of ['xlsx','docx']) {
    const template=await request.get(`${base}/admin/import/template?format=${format}&type=TRAC_NGHIEM`,{headers:ah});
    expect(template.status()).toBe(200);
    const preview=await request.post(`${base}/admin/import/preview`,{headers:ah,multipart:{chuDeId:String(topic.id),file:{name:`multi.${format}`,mimeType:'application/octet-stream',buffer:await template.body()}}});
    expect(preview.status()).toBe(200);
    const data=await preview.json();expect(data.warnings).toEqual([]);
    expect(data.questions[0].danhSachDapAn.filter((a:any)=>a.laDapAnDung)).toHaveLength(2);
  }
  await page.addInitScript(u=>localStorage.setItem('quiz_auth',JSON.stringify(u)),admin);
  await page.goto('/'); await page.getByRole('button',{name:'Quản trị',exact:true}).click();
  const create=page.getByRole('button',{name:'+ Tạo câu hỏi',exact:true});
  if(!await create.isVisible())await page.getByRole('button',{name:'Mở/đóng menu quản trị'}).click();
  await create.click(); await page.locator('.admin-topic-select select').selectOption(String(topic.id));
  await page.getByLabel('Nội dung câu hỏi',{exact:true}).first().fill('Chọn tất cả số chẵn');
  for(const [i,text] of ['2','3','4','5'].entries())await page.getByLabel(`Đáp án/token ${i+1}`,{exact:true}).first().fill(text);
  await page.getByLabel('Đáp án đúng 3',{exact:true}).first().check();
  const saved=page.waitForResponse(r=>r.url().endsWith('/api/cauhoi')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Lưu câu hỏi',exact:true}).click();
  expect((await saved).status()).toBe(200);
  const qs=await (await request.get(`${base}/cauhoi/chude/${topic.id}`,{headers:ah})).json();
  const q=qs[0], correct=q.danhSachDapAn.filter((a:any)=>a.laDapAnDung).map((a:any)=>a.id);
  expect(correct).toHaveLength(2);
  expect((await request.post(`${base}/cauhoi`,{headers:uh,data:q})).status()).toBe(403);
  const play=await (await request.get(`${base}/choi/chude/${topic.id}/cauhoi`)).json();
  expect(play[0].nhieuDapAn).toBe(true);expect(JSON.stringify(play)).not.toMatch(/laDapAnDung|dapAnDungIds|giaiThich/);
  for(const ids of [[correct[0]],[...correct,q.danhSachDapAn.find((a:any)=>!a.laDapAnDung).id],[]]) {
    const result=await (await request.post(`${base}/choi/nopbai`,{headers:uh,data:{chuDeId:topic.id,danhSachTraLoi:[{cauHoiId:q.id,dapAnIds:ids,thoiGianTraLoi:5}]}})).json();
    expect(result.soCauDung).toBe(0);expect(result.soCauChuaTraLoi).toBe(ids.length?0:1);
  }
  await page.addInitScript(u=>localStorage.setItem('quiz_auth',JSON.stringify(u)),user);await page.reload();
  await page.getByRole('heading',{name:title,exact:true}).click();
  await expect(page.getByText('Chọn tất cả đáp án đúng (không chọn thừa)',{exact:true})).toBeVisible();
  const options=page.locator('.quiz-answer');
  await options.filter({hasText:'2'}).click();await options.filter({hasText:'4'}).click();
  await expect(page.locator('.quiz-answer.is-selected')).toHaveCount(2);
  await options.filter({hasText:'4'}).click();await expect(page.locator('.quiz-answer.is-selected')).toHaveCount(1);
  await options.filter({hasText:'4'}).click();await page.reload();
  await expect(page.locator('.quiz-answer.is-selected')).toHaveCount(2);
  await page.getByRole('button',{name:page.viewportSize()!.width >= 1024 ? '↗ Nộp bài ngay' : 'Nộp bài',exact:true}).click();
  const submitted=page.waitForResponse(r=>r.url().endsWith('/api/choi/nopbai'));
  await page.getByRole('button',{name:'Xác nhận nộp bài',exact:true}).click();
  const result=await (await submitted).json();expect(result.soCauDung).toBe(1);
  expect(result.danhSachCauHoi[0].dapAnDaChonIds.sort()).toEqual([...correct].sort());
  expect(result.danhSachCauHoi[0].dapAnDungIds.sort()).toEqual([...correct].sort());
  await expect(page.getByText('✓ Đáp án đúng',{exact:true})).toHaveCount(2);
  const detail=await (await request.get(`${base}/admin/ketqua/${result.ketQuaId}/bai-lam`,{headers:ah})).json();
  expect(detail.baiLam.danhSachCauHoi[0].dapAnDungIds.sort()).toEqual([...correct].sort());
  expect((await request.get(`${base}/admin/ketqua/${result.ketQuaId}/bai-lam`,{headers:uh})).status()).toBe(403);
  await page.screenshot({path:`test-results/multi-result-${test.info().project.name}.png`,fullPage:true});
  await page.addInitScript(u=>localStorage.setItem('quiz_auth',JSON.stringify(u)),admin);await page.reload();
  await page.getByRole('button',{name:'Quản trị',exact:true}).click();
  const users=page.getByRole('button',{name:'👥 Người dùng',exact:true});
  if(!await users.isVisible())await page.getByRole('button',{name:'Mở/đóng menu quản trị'}).click();
  await users.click();await page.getByText('@qa_user',{exact:true}).click();
  await page.getByText(title,{exact:true}).first().locator('..').getByRole('button',{name:'Xem bài làm',exact:true}).click();
  await expect(page.locator('.submission-options li.correct')).toHaveCount(2);
  await expect(page.locator('.submission-options').getByText('Đã chọn',{exact:true})).toHaveCount(2);
  await page.screenshot({path:`test-results/multi-admin-review-${test.info().project.name}.png`,fullPage:true});
});
