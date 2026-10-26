import { expect, test, type Page } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectTableLoaded, openAdminPage } from './admin-page';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures');

export type CrudScenarioConfig = {
  module: string;
  path: string;
  searchKeyword?: string;
  create?: { button: string | RegExp; dialog: string | RegExp };
  editDialog: string | RegExp;
  /** 双栏页等指定表格作用域 */
  panel?: (page: Page) => ReturnType<Page['locator']>;
};

function scenarioTags(module: string, path: string, scenario: string) {
  return [`@module:${module}`, `@page:${path}`, `@scenario:${scenario}`];
}

function tableScope(page: Page, panel?: ReturnType<Page['locator']>) {
  return panel ?? page.locator('.art-list-panel').first();
}

/** 等待列表 loading 遮罩消失，避免搜索按钮被拦截 */
async function waitPanelReady(scope: ReturnType<Page['locator']>) {
  const mask = scope.locator('.el-loading-mask');
  if ((await mask.count()) > 0) {
    await expect(mask.first()).toBeHidden({ timeout: 30_000 });
  }
}

/** 点击表格操作（支持「更多」溢出菜单） */
export async function clickTableAction(
  page: Page,
  label: string,
  panel?: ReturnType<Page['locator']>,
) {
  const scope = tableScope(page, panel);
  await waitPanelReady(scope);
  await expect(scope.locator('.el-table__row').first()).toBeVisible({ timeout: 30_000 });

  const inline = scope.locator('.art-table-actions__link').filter({ hasText: new RegExp(`^${label}$`) });
  if ((await inline.count()) > 0) {
    await inline.first().click();
    return;
  }
  const more = scope.locator('.art-table-actions__link').filter({ hasText: /^更多$/ }).first();
  await expect(more).toBeVisible({ timeout: 15_000 });
  await more.click();
  const menuItem = page.getByRole('menuitem', { name: label });
  await expect(menuItem).toBeVisible({ timeout: 5_000 });
  await menuItem.click();
}

/** 搜索后列表/主内容仍可见 */
export async function scenarioSearch(page: Page, keyword = 'a', panel?: ReturnType<Page['locator']>) {
  const scope = tableScope(page, panel);
  await waitPanelReady(scope);
  const searchArea = scope.locator('.art-list-panel__search');
  await expect(searchArea).toBeVisible({ timeout: 15_000 });

  const textInput = searchArea.locator('input.el-input__inner:not([readonly])');
  const select = searchArea.locator('.el-select');
  await expect(textInput.or(select).first()).toBeVisible({ timeout: 15_000 });

  if ((await textInput.count()) > 0) {
    await textInput.first().fill(keyword);
  } else {
    await select.first().click();
    const dropdown = page.locator('.el-select-dropdown:visible').last();
    await expect(dropdown).toBeVisible({ timeout: 5_000 });
    await dropdown.getByRole('option').first().click();
  }

  await waitPanelReady(scope);
  await searchArea.getByRole('button', { name: /^搜索$|^查询$|Search/i }).click();
  await expect(page.locator('.el-table, .file-grid-wrap, .el-empty').first()).toBeVisible({
    timeout: 15_000,
  });
}

/** 打开新增弹窗后取消（不落库） */
export async function scenarioCreateDialog(
  page: Page,
  button: string | RegExp,
  dialog: string | RegExp,
  panel?: ReturnType<Page['locator']>,
) {
  const scope = panel ?? page.locator('.art-list-panel').first();
  const headActions = scope.locator('.art-list-panel__head-actions');
  const btn = (await headActions.count())
    ? headActions.getByRole('button', { name: button })
    : scope.getByRole('button', { name: button });
  await expect(btn).toBeVisible({ timeout: 15_000 });
  await btn.click();
  const dlg = page.getByRole('dialog').filter({ hasText: dialog });
  await expect(dlg).toBeVisible({ timeout: 10_000 });
  await dlg.getByRole('button', { name: /^取消$|Cancel/i }).click();
}

/** 打开首行编辑弹窗后取消 */
export async function scenarioEditDialog(page: Page, dialog: string | RegExp, panel?: ReturnType<Page['locator']>) {
  await clickTableAction(page, '编辑', panel);
  const dlg = page.getByRole('dialog').filter({ hasText: dialog });
  await expect(dlg).toBeVisible({ timeout: 10_000 });
  await dlg.getByRole('button', { name: /^取消$|Cancel/i }).click();
}

/** 打开删除确认框后取消 */
export async function scenarioDeleteConfirm(page: Page, panel?: ReturnType<Page['locator']>) {
  await clickTableAction(page, '删除', panel);
  const box = page.locator('.el-message-box');
  await expect(box).toBeVisible({ timeout: 10_000 });
  await box.getByRole('button', { name: /^取消$|Cancel/i }).click();
}

/** 文件页无数据时上传 smoke 夹具，保证删除场景可测 */
async function ensureFileCard(page: Page) {
  const card = page.locator('.file-card').first();
  if (await card.isVisible().catch(() => false)) return;
  await page.locator('input[type="file"]').first().setInputFiles(join(fixturesDir, 'smoke.png'));
  await expect(card).toBeVisible({ timeout: 30_000 });
}

/** 列表表格渲染 */
export async function scenarioList(page: Page, panel?: ReturnType<Page['locator']>) {
  const scope = tableScope(page, panel);
  await expect(scope.locator('.el-table').first()).toBeVisible({ timeout: 15_000 });
}

/** 注册 CRUD 场景（search/create/update/delete），需在 describe 内调用 */
export function registerCrudScenarios(config: CrudScenarioConfig) {
  const { module, path, searchKeyword = 'a', create, editDialog, panel } = config;

  test(`${path} 搜索筛选`, { tag: scenarioTags(module, path, 'search') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioSearch(page, searchKeyword, panel?.(page));
  });

  if (create) {
    test(`${path} 新增弹窗`, { tag: scenarioTags(module, path, 'create') }, async ({ page }) => {
      await openAdminPage(page, path);
      await scenarioCreateDialog(page, create.button, create.dialog);
    });
  }

  test(`${path} 编辑弹窗`, { tag: scenarioTags(module, path, 'update') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioEditDialog(page, editDialog, panel?.(page));
  });

  test(`${path} 删除确认`, { tag: scenarioTags(module, path, 'delete') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioDeleteConfirm(page, panel?.(page));
  });
}

/** 仅 search（只读/会话类页面） */
export function registerSearchScenario(module: string, path: string, keyword = 'admin') {
  test(`${path} 搜索筛选`, { tag: scenarioTags(module, path, 'search') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioSearch(page, keyword);
  });
}

/** Tab 页列表场景 */
export function registerTabListScenario(module: string, path: string, tabName: string) {
  test(`${path} 列表加载`, { tag: scenarioTags(module, path, 'list') }, async ({ page }) => {
    await openAdminPage(page, path);
    await expect(page.getByRole('tab', { name: tabName })).toHaveClass(/is-active/);
    await expectTableLoaded(page);
  });
}

/** 文件页：上传控件可见 */
export async function scenarioUploadControl(page: Page) {
  await expect(page.locator('.file-grid-wrap')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: '上传图片' }).first()).toBeVisible();
  await expect(page.locator('input[type="file"]').first()).toBeAttached();
}

/** 定时任务无搜索栏 */
export function registerJobScenarios(module: string, path: string) {
  test(`${path} 新增弹窗`, { tag: scenarioTags(module, path, 'create') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioCreateDialog(page, '新增任务', /新增任务/);
  });
  test(`${path} 编辑弹窗`, { tag: scenarioTags(module, path, 'update') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioEditDialog(page, /编辑任务/);
  });
  test(`${path} 删除确认`, { tag: scenarioTags(module, path, 'delete') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioDeleteConfirm(page);
  });
}

/** 短信/邮件 Tab 页 CRUD（默认通道 Tab） */
export function registerChannelTabScenarios(module: string, path: string, label: { create: string; dialog: RegExp; edit: RegExp }) {
  registerTabListScenario(module, path, '通道');
  test(`${path} 搜索筛选`, { tag: scenarioTags(module, path, 'search') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioSearch(page, 'test');
  });
  test(`${path} 新增弹窗`, { tag: scenarioTags(module, path, 'create') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioCreateDialog(page, label.create, label.dialog);
  });
  test(`${path} 编辑弹窗`, { tag: scenarioTags(module, path, 'update') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioEditDialog(page, label.edit);
  });
  test(`${path} 删除确认`, { tag: scenarioTags(module, path, 'delete') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioDeleteConfirm(page);
  });
}

/** 消息中心 */
export function registerMessageScenarios() {
  const module = 'notice';
  const path = '/system/message';
  registerTabListScenario(module, path, '收件箱');
  test(`${path} 搜索筛选`, { tag: scenarioTags(module, path, 'search') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioSearch(page, '系统');
  });
  test(`${path} 删除确认`, { tag: scenarioTags(module, path, 'delete') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioDeleteConfirm(page);
  });
}

/** 审计日志列表（登录 Tab） */
export function registerAuditListScenario() {
  const module = 'audit';
  const path = '/system/audit-logs';
  test(`${path} 列表加载`, { tag: scenarioTags(module, path, 'list') }, async ({ page }) => {
    await openAdminPage(page, path);
    await expect(page.getByRole('tab', { name: '登录日志' })).toHaveClass(/is-active/);
    await expectTableLoaded(page);
  });
}

/** 字典页：针对左侧「字典类型」面板 */
export function registerDictScenarios() {
  const module = 'dict';
  const path = '/system/dict';
  const panel = (page: Page) => page.locator('.dict-page .art-list-panel').first();

  test(`${path} 搜索筛选`, { tag: scenarioTags(module, path, 'search') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioSearch(page, 'sys', panel(page));
  });
  test(`${path} 新增弹窗`, { tag: scenarioTags(module, path, 'create') }, async ({ page }) => {
    await openAdminPage(page, path);
    await page.locator('.dict-page .art-list-panel').first().getByRole('button', { name: '新增类型' }).click();
    await expect(page.getByRole('dialog').filter({ hasText: /新增字典类型/ })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('dialog').getByRole('button', { name: /^取消$|Cancel/i }).click();
  });
  test(`${path} 编辑弹窗`, { tag: scenarioTags(module, path, 'update') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioEditDialog(page, /编辑字典类型/, panel(page));
  });
  test(`${path} 删除确认`, { tag: scenarioTags(module, path, 'delete') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioDeleteConfirm(page, panel(page));
  });
}

/** 文件管理 */
export function registerFileScenarios() {
  const module = 'upload';
  const path = '/system/file';
  test(`${path} 搜索筛选`, { tag: scenarioTags(module, path, 'search') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioSearch(page, 'png');
  });
  test(`${path} 上传控件`, { tag: scenarioTags(module, path, 'upload') }, async ({ page }) => {
    await openAdminPage(page, path);
    await scenarioUploadControl(page);
  });
  test(`${path} 删除确认`, { tag: scenarioTags(module, path, 'delete') }, async ({ page }) => {
    await openAdminPage(page, path);
    await ensureFileCard(page);
    await page.locator('.file-card').first().getByRole('button', { name: '删除' }).click();
    const box = page.locator('.el-message-box');
    await expect(box).toBeVisible({ timeout: 10_000 });
    await box.getByRole('button', { name: /^取消$|Cancel/i }).click();
  });
}
