import { test, expect } from "@playwright/test";

test("homepage uses real topics, search and groups; honest future features and contact footer", async ({
  page,
  request,
}) => {
  const topics = await (
    await request.get(`${process.env.QA_BACKEND_URL}/chude/thongke`)
  ).json();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Học thông minh",
  );
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
    "Ngô Quang Mạnh",
  );
  await expect(page.locator(".home-topic-card")).toHaveCount(topics.length);
  await expect(page.locator(".home-hero-art img")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".home-hero-art img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
  await expect(
    page.getByRole("navigation", { name: "Menu chính" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đề thi của tôi", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Tìm kiếm đề thi", { exact: true }).fill("QA Demo");
  await expect(page.locator(".home-topic-card")).toHaveCount(1);
  await expect(page.locator(".home-topic-card")).toContainText(
    `${topics.find((t: any) => t.tenChuDe === "QA Demo").soCauHoi} câu hỏi`,
  );
  await page
    .getByLabel("Tìm kiếm đề thi", { exact: true })
    .fill("does not exist abc");
  await expect(
    page.getByText("Không có chủ đề phù hợp.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xem tất cả →", exact: true }).click();
  await expect(page.locator(".home-topic-card")).toHaveCount(topics.length);
  await expect(
    page.locator(".home-footer").getByText("Ngô Quang Mạnh", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.home-footer a[href="tel:0962022716"]'),
  ).toBeVisible();
  await expect(
    page
      .locator('.home-footer a[href="mailto:quangmanh12082005@gmail.com"]')
      .first(),
  ).toBeVisible();
  await expect(page.locator('.home-footer a[href*="facebook"]')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/home-${test.info().project.name}.png`,
    fullPage: true,
  });
});
