import { test, expect } from '@playwright/test';
const base=process.env.QA_BACKEND_URL!;
test('submit persists immutable review; only admin can read; filters and legacy history',async({page,request})=>{
  async function login(role:string) {const r=await request.post(`${base}/auth/login`,{data:{username:`qa_${role}`,matKhau:process.env.QA_PASSWORD}});expect(r.status()).toBe(200);return r.json();}
  const admin=await login('admin'),user=await login('user');
  const ah={Authorization:`Bearer ${admin.token}`}, uh={Authorization:`Bearer ${user.token}`};
  const groups=await (await request.get(`${base}/admin/nhom-mon`,{headers:ah})).json();
  const topicResponse=await request.post(`${base}/chude`,{headers:ah,data:{tenChuDe:`Snapshot QA ${Date.now()}`,nhomMon:{id:groups[0].id},hienDapAnSauNop:false,choPhepXemDapAn:false}});
  expect(topicResponse.status()).toBe(200);const topic=await topicResponse.json();
  const qs:any[]=[];
  for(const [i,kind] of ['TRAC_NGHIEM','DIEN_TU','SAP_XEP'].entries()) {
    const texts=kind==='TRAC_NGHIEM'?['Hà Nội','Huế','Đà Nẵng','Hải Phòng']:kind==='DIEN_TU'?['中国','Trung Quốc']:['我','学习','中文'];
    const r=await request.post(`${base}/cauhoi`,{headers:ah,data:{chuDe:{id:topic.id},thuTu:i,loaiCauHoi:kind,noiDungCauHoi:`Snapshot ${kind} 中国`,giaiThich:'Giải thích gốc 中文',danhSachDapAn:texts.map((noiDung,n)=>({noiDung,thuTu:n,laDapAnDung:kind==='DIEN_TU'||n===0}))}});
    expect(r.status()).toBe(200);qs.push(await r.json());
  }
  const play=await (await request.get(`${base}/choi/chude/${topic.id}/cauhoi`)).json();
  expect(JSON.stringify(play)).not.toMatch(/dapAnDung|laDapAnDung|giaiThich/);
  const submitted=await request.post(`${base}/choi/nopbai`,{headers:uh,data:{chuDeId:topic.id,userId:admin.id,tenNguoiChoi:'spoof',thoiGianLam:15,danhSachTraLoi:[{cauHoiId:qs[0].id,dapAnId:qs[0].danhSachDapAn[0].id,thoiGianTraLoi:5},{cauHoiId:qs[1].id,cauTraLoiText:'Sai',thoiGianTraLoi:10}]}});
  expect(submitted.status()).toBe(200);const result=await submitted.json();expect(result.danhSachCauHoi).toEqual([]);
  const path=`${base}/admin/ketqua/${result.ketQuaId}/bai-lam`;
  expect((await request.get(path)).status()).toBe(403);expect((await request.get(path,{headers:uh})).status()).toBe(403);
  const detail=await (await request.get(path,{headers:ah})).json();expect(detail.coChiTiet).toBe(true);expect(detail.userId).toBe(user.id);expect(detail.tenNguoiChoi).not.toBe('spoof');
  expect(detail.baiLam.danhSachCauHoi.map((q:any)=>q.ketQua)).toEqual(['DUNG','SAI','CHUA_TRA_LOI']);expect(detail.baiLam.diemSo).toBe(result.diemSo);expect(detail.baiLam.thoiGianLam).toBe(15);
  expect(detail.baiLam.danhSachCauHoi[1].dapAnDungText).toContain('中国');
  expect((await request.delete(`${base}/cauhoi/${qs[0].id}`,{headers:ah})).status()).toBe(204);
  expect((await request.get(path,{headers:ah})).status()).toBe(200);expect(await (await request.get(path,{headers:ah})).json()).toEqual(detail);
  expect((await request.get(`${base}/admin/ketqua/9223372036854775807/bai-lam`,{headers:ah})).status()).toBe(404);
  const history=await (await request.get(`${base}/admin/nguoidung/${user.id}/lichsu`,{headers:ah})).json();
  const legacy=history.find((r:any)=>r.diemSo===123);expect(legacy).toBeTruthy();const old=await (await request.get(`${base}/admin/ketqua/${legacy.ketQuaId}/bai-lam`,{headers:ah})).json();expect(old.coChiTiet).toBe(false);expect(old.baiLam).toBeNull();
  await page.addInitScript(u=>localStorage.setItem('quiz_auth',JSON.stringify(u)),admin);await page.goto('/');await page.getByRole('button',{name:'Quản trị',exact:true}).click();
  const nav=page.getByRole('button',{name:'👥 Người dùng',exact:true});if(!await nav.isVisible())await page.getByRole('button',{name:'Mở/đóng menu quản trị'}).click();await nav.click();
  await page.getByText('@qa_user',{exact:true}).click();
  await page.getByText(topic.tenChuDe,{exact:true}).locator('..').getByRole('button',{name:'Xem bài làm',exact:true}).click();
  await expect(page.getByRole('heading',{name:`Chi tiết bài làm #${result.ketQuaId}`})).toBeVisible();await expect(page.locator('.submission-card article')).toHaveCount(0);
  await expect(page.locator('article.submission-card')).toHaveCount(3);
  for(const label of ['Câu đúng (1)','Câu sai (1)','Chưa trả lời (1)']) {await page.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('article.submission-card')).toHaveCount(1);}
  await page.getByRole('button',{name:'Tất cả (3)',exact:true}).click();await expect(page.getByText('Giải thích gốc 中文',{exact:true})).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/submission-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'← Danh sách kết quả',exact:true}).click();
  await page.getByText('123 điểm',{exact:true}).locator('..').getByRole('button',{name:'Xem bài làm',exact:true}).click();await expect(page.getByRole('heading',{name:'Bài làm cũ chưa có dữ liệu chi tiết'})).toBeVisible();
});
