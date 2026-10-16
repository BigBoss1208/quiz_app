import { test, expect } from '@playwright/test';

test('desktop viewport with 50–200 questions and long content', async ({ browser }, info) => {
  const width = (info.project.use.viewport as {width:number}).width;
  test.skip(width < 1024, 'Mobile CSS unchanged');
  test.setTimeout(90000);
  for (const height of [600, 768, 1080]) for (const count of [50,100,200]) {
    const page = await browser.newPage({viewport:{width,height}});
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const topic = {id:1,tenChuDe:'Layout fixture',soCauHoi:count,luotChoi:0,topDiem:[],danhMuc:'Khoa học',choPhepXemDapAn:false};
      const questions = Array.from({length:count},(_,i)=>({id:i+1,noiDungCauHoi:count===200 ? 'Nội dung dài tiếng Việt và 中文. '.repeat(120) : 'Framework Java nào phổ biến nhất để xây dựng RESTful API?',loaiCauHoi:'TRAC_NGHIEM',danhSachDapAn:['Spring Boot','Django','Flask','React'].map((s,j)=>({id:i*4+j+1,noiDung:count===200 ? s+' đáp án dài '.repeat(80) : s}))}));
      return route.fulfill({json:path.endsWith('/chude/thongke')?[topic]:path.includes('/choi/')?questions:[]});
    });
    await page.goto('/');
    await page.getByRole('heading',{name:'Layout fixture',exact:true}).click();
    await expect(page.locator('.quiz-question-number')).toHaveCount(count);
    const m = await page.evaluate(() => {
      const rect=(s:string)=>document.querySelector(s)!.getBoundingClientRect();
      const a=rect('.quiz-main'),b=rect('.quiz-sidebar');
      const visible=(s:string)=>{const r=rect(s);return r.top>=0&&r.bottom<=innerHeight;};
      const scrolls=(s:string)=>{const e=document.querySelector(s)!;return e.scrollHeight>e.clientHeight;};
      return {ratio:a.width/(a.width+b.width),overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight+1,header:visible('.quiz-header'),submit:visible('.quiz-submit-sidebar'),footer:visible('.quiz-navigation'),navScroll:scrolls('.quiz-question-list'),contentScroll:scrolls('.quiz-question-transition')};
    });
    expect(m.ratio).toBeCloseTo(.67,2); expect(m.overflow).toBe(false);
    expect(m.header).toBe(true); expect(m.submit).toBe(true); expect(m.footer).toBe(true);
    if(count===200) { expect(m.navScroll).toBe(true); expect(m.contentScroll).toBe(true); }
    await page.locator('.quiz-question-number').last().scrollIntoViewIfNeeded();
    await expect(page.locator('.quiz-question-number').last()).toBeInViewport();
    await page.locator('.quiz-answer').last().scrollIntoViewIfNeeded();
    await expect(page.locator('.quiz-answer').last()).toBeInViewport();
    await expect(page.locator('.quiz-submit-sidebar')).toBeInViewport();
    if(count===50 && height===768) await page.screenshot({path:`test-results/viewport-${width}-${height}.png`});
    await page.close();
  }
});
