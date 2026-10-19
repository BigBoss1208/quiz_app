import { test, expect } from '@playwright/test';

test('unresponsive topics request ends with retry and recovers', async ({ page }) => {
  let recover = false;
  await page.route('**/api/chude/thongke', async route => {
    if (recover) await route.fulfill({ json: [] });
    // Leave the first request pending to exercise the actual browser timeout.
  });
  await page.route('**/api/nhom-mon', route => route.fulfill({ json: [] }));
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Đang tải dữ liệu');
  const retry = page.getByRole('button', { name: 'Thử lại', exact: true });
  await expect(retry).toBeVisible({ timeout: 25000 });
  recover = true;
  await retry.click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Học thông minh');
  await expect(page.getByText('Đang tải dữ liệu...', { exact: true })).toHaveCount(0);
});

test('expired stored Admin session is not treated as logged in', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('quiz_auth', JSON.stringify({
    id: 1, username: 'expired_admin', hoTen: 'Admin', vaiTro: 'ADMIN',
    token: `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`,
  })));
  await page.route('**/api/chude/thongke', route => route.fulfill({ json: [] }));
  await page.route('**/api/nhom-mon', route => route.fulfill({ json: [] }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('quiz_auth'))).toBeNull();
});

test('server rejection of an Admin token opens login, including import API sessions', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('quiz_auth', JSON.stringify({
    id: 1, username: 'revoked_admin', hoTen: 'Admin', vaiTro: 'ADMIN',
    token: `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`,
  })));
  await page.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.route('**/api/admin/**', route => route.fulfill({ status: 403, json: { error: 'Forbidden' } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Quản trị', exact: true }).click();
  await expect(page.getByPlaceholder('ten_dang_nhap')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('quiz_auth'))).toBeNull();
});
