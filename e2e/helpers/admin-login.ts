import { expect, type Page } from '@playwright/test';

/** 完成登录页滑块验证 */
export async function passDragVerify(page: Page): Promise<void> {
  const track = page.locator('.drag_verify');
  const handle = page.locator('.dv_handler');
  await expect(track).toBeVisible();
  const trackBox = await track.boundingBox();
  const handleBox = await handle.boundingBox();
  if (!trackBox || !handleBox) {
    throw new Error('未找到滑块验证组件');
  }
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(trackBox.x + trackBox.width - 8, trackBox.y + trackBox.height / 2, {
    steps: 25,
  });
  await page.mouse.up();
  await expect(page.getByText(/验证成功|Verification successful/i)).toBeVisible({ timeout: 5000 });
}

/** Admin 登录（需 dev 环境：admin :5173 + server :3001 + seed） */
export async function loginAsAdmin(page: Page): Promise<void> {
  const response = await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) {
    throw new Error(
      'Admin 未就绪。请先执行 pnpm dev（默认 http://localhost:5173）并 pnpm seed，或设置 VERIFY_ADMIN_URL',
    );
  }

  const usernameInput = page.getByPlaceholder(/请输入账号|Please enter your account/i);
  const passwordInput = page.getByPlaceholder(/请输入密码|Please enter your password/i);
  await expect(usernameInput).toBeVisible({ timeout: 15_000 });
  await usernameInput.fill('admin');
  await passwordInput.fill('admin123');
  // 开发模式隐藏滑块；生产预览仍完成滑块验证。
  if (await page.locator('.drag_verify').count()) {
    await passDragVerify(page);
  }
  await page.getByRole('button', { name: /登录|Login/i }).click();
  // Hash 路由：pathname 仍为 /auth/login，以 hash 或侧栏菜单判断登录成功
  await expect
    .poll(() => {
      const url = page.url();
      return /#\/(?!auth\/login)/.test(url);
    })
    .toBe(true);
}
